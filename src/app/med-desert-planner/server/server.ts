import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { createApp, analytics, genie, server, sql } from '@databricks/appkit';
import type { Request, Response } from 'express';

type SqlString = ReturnType<typeof sql.string>;
type GenieStreamEvent =
  | { type: 'message_start'; conversationId?: string; messageId?: string; spaceId?: string }
  | { type: 'status'; status: string }
  | { type: 'message_result'; message: { content?: string } }
  | { type: 'query_result'; data?: { result?: { data_array?: (string | null)[][] } } }
  | { type: 'error'; error: string }
  | {
      type: 'history_info';
      conversationId?: string;
      spaceId?: string;
      nextPageToken?: string | null;
      loadedCount?: number;
    };

type GenieApi = {
  sendMessage: (alias: string, content: string) => AsyncGenerator<GenieStreamEvent>;
};

type AnalyticsApi = {
  asUser: (req: Request) => {
    query: (statement: string, parameters?: Record<string, SqlString | null | undefined>) => Promise<unknown>;
  };
};

type FlaggedDistrict = {
  district_name: string;
  state: string;
  specialty: string;
  gap_score: number;
  confidence_label: string;
  verdict_label: string;
  demand_label: string;
  n_facilities: number;
  documented_supply_rate: number;
};

type PlanSection = {
  executive_summary: string;
  priority_regions: Array<{
    region: string;
    specialty: string;
    risk_analysis: string;
    recommended_action: string;
  }>;
  cross_cutting_interventions: string[];
  field_verification_checklist: string[];
};

function getDatabricksCredentials(): { host: string; token: string } {
  const envHost = process.env.DATABRICKS_HOST ?? '';
  const envToken = process.env.DATABRICKS_TOKEN ?? '';
  if (envHost && envToken) return { host: envHost, token: envToken };

  const profile = process.env.DATABRICKS_CONFIG_PROFILE ?? 'DEFAULT';
  try {
    const configPath = join(homedir(), '.databrickscfg');
    const config = readFileSync(configPath, 'utf-8');
    const profileMatch = config.match(new RegExp(`\\[${profile}\\]([^\\[]*)`));
    if (profileMatch) {
      const hostMatch = profileMatch[1].match(/host\s*=\s*(.+)/);
      const tokenMatch = profileMatch[1].match(/token\s*=\s*(.+)/);
      return {
        host: (envHost || hostMatch?.[1]?.trim() || '').replace(/\/$/, ''),
        token: envToken || tokenMatch?.[1]?.trim() || '',
      };
    }
  } catch {
    // ignore config read errors
  }
  return { host: envHost.replace(/\/$/, ''), token: envToken };
}

function addPdfSection(doc: InstanceType<typeof PDFDocument>, title: string) {
  doc.moveDown(0.8);
  doc.fontSize(11).fillColor('#1e3a5f').font('Helvetica-Bold').text(title.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveTo(doc.page.margins.left, doc.y + 2)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .strokeColor('#d0dce8')
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(10).fillColor('#1a1a2e');
}

function addPdfBullet(doc: InstanceType<typeof PDFDocument>, text: string) {
  const x = doc.page.margins.left + 12;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - 12;
  doc.fontSize(10).fillColor('#1a1a2e').font('Helvetica')
    .text(`• ${text}`, x, doc.y, { width, indent: 0 });
}

function text(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function jsonResponse(res: Response, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

function addSpecialty(target: Set<string>, value: unknown) {
  if (typeof value !== 'string') return;
  const specialty = value.trim();
  if (specialty) target.add(specialty);
}

function addSpecialtiesFromText(target: Set<string>, textValue: string) {
  const textBody = textValue.trim();
  if (!textBody) return;

  const jsonMatch = textBody.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) addSpecialty(target, item);
        return;
      }
    } catch {
      // Fall through to line parsing.
    }
  }

  for (const line of textBody.split(/\r?\n/)) {
    const cleaned = line
      .replace(/^[-*•\d.)\s]+/, '')
      .replace(/^["'`]+|["'`:]+$/g, '')
      .trim();
    addSpecialty(target, cleaned);
  }
}

async function runUserSql(
  analyticsApi: AnalyticsApi,
  req: Request,
  statement: string,
  parameters: Record<string, SqlString | null | undefined>
) {
  return analyticsApi.asUser(req).query(statement, parameters);
}

createApp({
  plugins: [analytics(), genie(), server()],
  onPluginsReady(appkit) {
    const analyticsApi = appkit.analytics as AnalyticsApi;
    const genieApi = appkit.genie as GenieApi;

    appkit.server.extend((app) => {
      app.post('/api/genie/map-problem', async (req: Request, res: Response) => {
        try {
          const body = req.body as Record<string, unknown>;
          const problem = text(body.problem);

          if (!problem) {
            return jsonResponse(res, 400, { error: 'problem is required' });
          }

          const geniePrompt = [
            'Map this medical access problem to the planner capability filter vocabulary.',
            'Return only selectable specialty/capability names or specialty codes that best match the problem.',
            'Prefer exact values from the app specialty vocabulary. If you query data, return one column named specialty.',
            'Do not include explanations.',
            `Problem: ${problem}`,
          ].join('\n');

          const specialties = new Set<string>();
          let rawResponse = '';

          for await (const event of genieApi.sendMessage('default', geniePrompt)) {
            if (event.type === 'message_result') {
              rawResponse = event.message.content ?? '';
              if (specialties.size === 0) addSpecialtiesFromText(specialties, rawResponse);
            } else if (event.type === 'query_result') {
              const rows = event.data?.result?.data_array ?? [];
              for (const row of rows) {
                if (row.length === 1 && typeof row[0] === 'string' && row[0].trim().startsWith('[')) {
                  addSpecialtiesFromText(specialties, row[0]);
                } else {
                  addSpecialty(specialties, row[0]);
                }
              }
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          }

          return jsonResponse(res, 200, { specialties: [...specialties], rawResponse });
        } catch (error) {
          console.error('Failed to map problem via Genie', error);
          return jsonResponse(res, 500, {
            error: 'Failed to map problem to capabilities',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      });

      app.post('/api/scenarios', async (req: Request, res: Response) => {
        try {
          const body = req.body as Record<string, unknown>;
          const scenarioId = crypto.randomUUID();
          const name = text(body.name, 'Untitled scenario');
          const specialty = text(body.specialty);
          const notes = text(body.notes);
          const geoFilterJson = JSON.stringify(body.geoFilter ?? {});
          const createdBy = text(req.header('x-forwarded-user'), 'local-dev-user');

          if (!specialty) {
            return jsonResponse(res, 400, { error: 'specialty is required' });
          }

          await runUserSql(
            analyticsApi,
            req,
            `INSERT INTO medical_desert_planner.app.planning_scenarios
             (scenario_id, name, created_by, created_at, updated_at, specialty, geo_filter_json, notes)
             VALUES (:scenario_id, :name, :created_by, current_timestamp(), current_timestamp(), :specialty, :geo_filter_json, :notes)`,
            {
              scenario_id: sql.string(scenarioId),
              name: sql.string(name),
              created_by: sql.string(createdBy),
              specialty: sql.string(specialty),
              geo_filter_json: sql.string(geoFilterJson),
              notes: sql.string(notes),
            }
          );

          return jsonResponse(res, 201, { scenario_id: scenarioId });
        } catch (error) {
          console.error('Failed to save scenario', error);
          return jsonResponse(res, 500, { error: 'Failed to save scenario' });
        }
      });

      app.post('/api/shortlist', async (req: Request, res: Response) => {
        try {
          const body = req.body as Record<string, unknown>;
          const scenarioId = text(body.scenario_id);
          const facilityId = text(body.facility_id);
          const note = text(body.note);

          if (!scenarioId || !facilityId) {
            return jsonResponse(res, 400, { error: 'scenario_id and facility_id are required' });
          }

          await runUserSql(
            analyticsApi,
            req,
            `INSERT INTO medical_desert_planner.app.shortlist_items
             (scenario_id, facility_id, added_at, note)
             VALUES (:scenario_id, :facility_id, current_timestamp(), :note)`,
            {
              scenario_id: sql.string(scenarioId),
              facility_id: sql.string(facilityId),
              note: sql.string(note),
            }
          );

          return jsonResponse(res, 201, { ok: true });
        } catch (error) {
          console.error('Failed to shortlist facility', error);
          return jsonResponse(res, 500, { error: 'Failed to shortlist facility' });
        }
      });

      app.post('/api/generate-plan', async (req: Request, res: Response) => {
        try {
          const body = req.body as Record<string, unknown>;
          const name = text(body.name, 'Care Gap Intervention Plan');
          const notes = text(body.notes);
          const flaggedDistricts = (Array.isArray(body.flaggedDistricts) ? body.flaggedDistricts : []) as FlaggedDistrict[];

          if (flaggedDistricts.length === 0) {
            return jsonResponse(res, 400, { error: 'At least one district must be flagged' });
          }

          const { host, token } = getDatabricksCredentials();

          const districtLines = flaggedDistricts.map(
            (d) =>
              `  - ${d.district_name}, ${d.state} | Specialty: ${d.specialty} | Gap Score: ${d.gap_score.toFixed(2)} | Verdict: ${d.verdict_label} | Confidence: ${d.confidence_label} | Known facilities: ${d.n_facilities} | Documented supply rate: ${(d.documented_supply_rate * 100).toFixed(1)}%`
          );

          const systemPrompt = [
            'You are a senior healthcare infrastructure planning expert specialising in medical desert identification and care gap remediation in India.',
            'You work with the Virtue Foundation to help policymakers prioritise healthcare investments in underserved regions.',
            '',
            'When given a list of flagged districts with care gap data, produce a structured intervention plan as valid JSON.',
            'Reference the specific districts, specialties, gap scores, and confidence levels in your analysis.',
            'Be concrete and actionable — mention facility types, programme names, or ministry schemes where appropriate.',
            '',
            'Respond ONLY with a JSON object matching this exact schema (no markdown fences, no explanation outside JSON):',
            '{',
            '  "executive_summary": "<2-3 paragraphs summarising the overall care gap situation and highest-priority actions>",',
            '  "priority_regions": [',
            '    {',
            '      "region": "<district>, <state>",',
            '      "specialty": "<specialty>",',
            '      "risk_analysis": "<1-2 sentences on why this region is flagged and what the data shows>",',
            '      "recommended_action": "<specific, measurable intervention recommendation>"',
            '    }',
            '  ],',
            '  "cross_cutting_interventions": ["<intervention>", ...],',
            '  "field_verification_checklist": ["<checklist item>", ...]',
            '}',
          ].join('\n');

          const userPrompt = [
            `Plan name: ${name}`,
            '',
            'Flagged districts:',
            ...districtLines,
            '',
            notes ? `Planner notes: ${notes}` : 'Planner notes: None provided.',
            '',
            'Generate the intervention plan JSON now.',
          ].join('\n');

          const llmRes = await fetch(`${host}/serving-endpoints/gpt-5-4-mini/invocations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.3,
              max_tokens: 3000,
            }),
          });

          if (!llmRes.ok) {
            const errText = await llmRes.text();
            console.error('LLM call failed', llmRes.status, errText);
            return jsonResponse(res, 502, { error: 'LLM service unavailable', details: errText });
          }

          const llmJson = (await llmRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const rawContent = llmJson.choices?.[0]?.message?.content ?? '';

          let plan: PlanSection;
          try {
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            plan = JSON.parse(jsonMatch?.[0] ?? rawContent) as PlanSection;
          } catch {
            console.error('Failed to parse LLM JSON response', rawContent);
            return jsonResponse(res, 502, { error: 'Failed to parse plan from LLM response' });
          }

          const generatedAt = new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="care-plan-${Date.now()}.pdf"`);
          doc.pipe(res);

          // ── Cover header ───────────────────────────────────────────────
          doc.rect(0, 0, doc.page.width, 110).fill('#1e3a5f');
          doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
            .text('CareBricks', 50, 28, { characterSpacing: 0.5 });
          doc.fontSize(11).fillColor('#a8c4d8').font('Helvetica')
            .text('Medical Desert Intervention Plan  ·  Virtue Foundation  ·  India', 50, 56);
          doc.fontSize(15).fillColor('#ffffff').font('Helvetica-Bold')
            .text(name, 50, 78, { width: doc.page.width - 100 });

          doc.fillColor('#1a1a2e').font('Helvetica');
          doc.y = 128;

          doc.fontSize(9).fillColor('#6b7280')
            .text(`Generated ${generatedAt}  ·  ${flaggedDistricts.length} district${flaggedDistricts.length !== 1 ? 's' : ''} flagged`, {
              align: 'right',
            });

          // ── Executive summary ──────────────────────────────────────────
          addPdfSection(doc, 'Executive Summary');
          doc.fontSize(10).fillColor('#1a1a2e').font('Helvetica')
            .text(plan.executive_summary ?? '', { lineGap: 3 });

          // ── Planner notes ──────────────────────────────────────────────
          if (notes) {
            addPdfSection(doc, 'Planner Notes');
            doc.fontSize(10).fillColor('#374151').font('Helvetica-Oblique')
              .text(notes, { lineGap: 3 });
          }

          // ── Flagged regions summary ────────────────────────────────────
          addPdfSection(doc, 'Flagged Regions Summary');
          const colW = [160, 100, 55, 95, 85];
          const headers = ['District', 'State', 'Gap Score', 'Verdict', 'Confidence'];
          const rowX = doc.page.margins.left;

          // Header row
          doc.fontSize(8.5).fillColor('#ffffff').font('Helvetica-Bold');
          let cx = rowX;
          const headerY = doc.y;
          doc.rect(rowX, headerY, colW.reduce((a, b) => a + b, 0) + colW.length * 6, 16).fill('#1e3a5f');
          cx = rowX + 4;
          headers.forEach((h, i) => {
            doc.fillColor('#ffffff').text(h, cx, headerY + 3, { width: colW[i], lineBreak: false });
            cx += colW[i] + 6;
          });
          doc.moveDown(0.1);
          doc.y = headerY + 19;

          // Data rows
          flaggedDistricts.forEach((d, idx) => {
            const rowY = doc.y;
            if (idx % 2 === 0) {
              doc.rect(rowX, rowY, colW.reduce((a, b) => a + b, 0) + colW.length * 6, 15).fill('#f0f4f8');
            }
            const verdict = (d.verdict_label ?? '').replace(/_/g, ' ');
            const conf = (d.confidence_label ?? '').replace(/_/g, ' ');
            const cells = [d.district_name, d.state, d.gap_score.toFixed(2), verdict, conf];
            cx = rowX + 4;
            doc.fontSize(8).fillColor('#1a1a2e').font('Helvetica');
            cells.forEach((cell, i) => {
              doc.text(cell, cx, rowY + 3, { width: colW[i], lineBreak: false });
              cx += colW[i] + 6;
            });
            doc.y = rowY + 17;
          });

          // ── Per-region analysis ────────────────────────────────────────
          if (plan.priority_regions?.length > 0) {
            addPdfSection(doc, 'Regional Analysis');
            for (const pr of plan.priority_regions) {
              doc.moveDown(0.3);
              doc.fontSize(10).fillColor('#1e3a5f').font('Helvetica-Bold')
                .text(`${pr.region ?? ''}  —  ${pr.specialty ?? ''}`);
              doc.fontSize(9.5).fillColor('#374151').font('Helvetica')
                .text(pr.risk_analysis ?? '', { lineGap: 2 });
              doc.fontSize(9.5).fillColor('#1a5c3a').font('Helvetica-Bold').text('Recommendation: ', { continued: true });
              doc.font('Helvetica').fillColor('#374151').text(pr.recommended_action ?? '', { lineGap: 2 });
            }
          }

          // ── Cross-cutting interventions ────────────────────────────────
          if (plan.cross_cutting_interventions?.length > 0) {
            addPdfSection(doc, 'Cross-Cutting Interventions');
            for (const item of plan.cross_cutting_interventions) {
              addPdfBullet(doc, item);
            }
          }

          // ── Field verification checklist ───────────────────────────────
          if (plan.field_verification_checklist?.length > 0) {
            addPdfSection(doc, 'Field Verification Checklist');
            plan.field_verification_checklist.forEach((item, i) => {
              const x = doc.page.margins.left + 4;
              const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - 24;
              doc.fontSize(10).fillColor('#1a1a2e').font('Helvetica')
                .text(`${i + 1}. ${item}`, x, doc.y, { width, lineGap: 2 });
            });
          }

          // ── Footer on all pages ────────────────────────────────────────
          const range = doc.bufferedPageRange();
          for (let i = 0; i < range.count; i++) {
            doc.switchToPage(range.start + i);
            const footerY = doc.page.height - 38;
            doc.moveTo(doc.page.margins.left, footerY)
              .lineTo(doc.page.width - doc.page.margins.right, footerY)
              .strokeColor('#d0dce8').lineWidth(0.5).stroke();
            doc.fontSize(7.5).fillColor('#9ca3af').font('Helvetica')
              .text(`CareBricks · Medical Desert Intervention Plan · ${generatedAt}`, doc.page.margins.left, footerY + 6, {
                width: doc.page.width - doc.page.margins.left - doc.page.margins.right - 40,
              });
            doc.text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left, footerY + 6, {
              width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
              align: 'right',
            });
          }

          doc.end();
          return;
        } catch (error) {
          console.error('Failed to generate plan', error);
          if (!res.headersSent) {
            jsonResponse(res, 500, {
              error: 'Failed to generate plan',
              details: error instanceof Error ? error.message : String(error),
            });
          }
          return;
        }
      });

      app.post('/api/claim-reviews', async (req: Request, res: Response) => {
        try {
          const body = req.body as Record<string, unknown>;
          const reviewId = crypto.randomUUID();
          const scenarioId = text(body.scenario_id);
          const claimId = text(body.claim_id);
          const facilityId = text(body.facility_id);
          const status = text(body.review_status, 'unclear');
          const note = text(body.note);
          const reviewer = text(req.header('x-forwarded-user'), 'local-dev-user');

          if (!scenarioId || !claimId || !facilityId) {
            return jsonResponse(res, 400, { error: 'scenario_id, claim_id, and facility_id are required' });
          }

          await runUserSql(
            analyticsApi,
            req,
            `INSERT INTO medical_desert_planner.app.claim_reviews
             (review_id, scenario_id, claim_id, facility_id, review_status, reviewer, reviewed_at, note)
             VALUES (:review_id, :scenario_id, :claim_id, :facility_id, :review_status, :reviewer, current_timestamp(), :note)`,
            {
              review_id: sql.string(reviewId),
              scenario_id: sql.string(scenarioId),
              claim_id: sql.string(claimId),
              facility_id: sql.string(facilityId),
              review_status: sql.string(status),
              reviewer: sql.string(reviewer),
              note: sql.string(note),
            }
          );

          return jsonResponse(res, 201, { review_id: reviewId });
        } catch (error) {
          console.error('Failed to review claim', error);
          return jsonResponse(res, 500, { error: 'Failed to review claim' });
        }
      });
    });
  },
}).catch(console.error);
