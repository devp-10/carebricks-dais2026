import { createApp, analytics, server, sql } from '@databricks/appkit';
import type { Request, Response } from 'express';

type SqlString = ReturnType<typeof sql.string>;

type AnalyticsApi = {
  asUser: (req: Request) => {
    query: (
      statement: string,
      parameters?: Record<string, SqlString | null | undefined>,
    ) => Promise<unknown>;
  };
};

function text(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function jsonResponse(res: Response, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

async function runUserSql(
  analyticsApi: AnalyticsApi,
  req: Request,
  statement: string,
  parameters: Record<string, SqlString | null | undefined>,
) {
  return analyticsApi.asUser(req).query(statement, parameters);
}

createApp({
  plugins: [
    analytics(),
    server(),
  ],
  onPluginsReady(appkit) {
    const analyticsApi = appkit.analytics as AnalyticsApi;

    appkit.server.extend((app) => {
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
            },
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
            },
          );

          return jsonResponse(res, 201, { ok: true });
        } catch (error) {
          console.error('Failed to shortlist facility', error);
          return jsonResponse(res, 500, { error: 'Failed to shortlist facility' });
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
            },
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
