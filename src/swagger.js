const swaggerUi = require("swagger-ui-express");

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "FIDE Backend API",
    version: "1.0.0",
    description: "REST API for chapters, lessons, contents, answers, progress, and boss submission.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
        },
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: { 200: { description: "OK" } },
      },
    },
    "/chapters": {
      get: { tags: ["Chapters"], summary: "List chapters", responses: { 200: { description: "OK" } } },
    },
    "/chapters/{chapterSlug}": {
      get: {
        tags: ["Chapters"],
        summary: "Get chapter by slug",
        parameters: [{ name: "chapterSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
      },
    },
    "/chapters/{chapterSlug}/full": {
      get: {
        tags: ["Chapters"],
        summary: "Get chapter full tree",
        parameters: [{ name: "chapterSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
      },
    },
    "/sections/{sectionSlug}": {
      get: {
        tags: ["Sections"],
        summary: "Get section by slug",
        parameters: [{ name: "sectionSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
      },
    },
    "/chapters/{chapterSlug}/sections": {
      get: {
        tags: ["Sections"],
        summary: "List sections by chapter slug",
        parameters: [{ name: "chapterSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" } },
      },
    },
    "/lessons/{lessonSlug}": {
      get: {
        tags: ["Lessons"],
        summary: "Get lesson by slug",
        parameters: [{ name: "lessonSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
      },
    },
    "/sections/{sectionSlug}/lessons": {
      get: {
        tags: ["Lessons"],
        summary: "List lessons by section slug",
        parameters: [{ name: "sectionSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" } },
      },
    },
    "/lessons/{lessonSlug}/full": {
      get: {
        tags: ["Lessons"],
        summary: "Get lesson with all contents",
        parameters: [{ name: "lessonSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" } },
      },
    },
    "/contents/{contentSlug}": {
      get: {
        tags: ["Contents"],
        summary: "Get content by slug",
        parameters: [{ name: "contentSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" } },
      },
    },
    "/lessons/{lessonSlug}/contents": {
      get: {
        tags: ["Contents"],
        summary: "List contents by lesson slug",
        parameters: [
          { name: "lessonSlug", in: "path", required: true, schema: { type: "string" } },
          {
            name: "type",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["material", "question"] },
            description: "Optional content type filter",
          },
        ],
        responses: { 200: { description: "OK" }, 400: { description: "Bad request" } },
      },
    },
    "/answers": {
      post: {
        tags: ["Answers"],
        summary: "Submit answer for a question content",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["contentSlug", "selectedOption"],
                properties: {
                  contentSlug: { type: "string" },
                  selectedOption: { type: "string", example: "a" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/progress": {
      get: {
        tags: ["Progress"],
        summary: "Get current user progress",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/progress/lesson/{lessonSlug}": {
      post: {
        tags: ["Progress"],
        summary: "Upsert lesson progress",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "lessonSlug", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["not_started", "in_progress", "completed"] },
                  lastContentSlug: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/progress/content/{contentSlug}": {
      post: {
        tags: ["Progress"],
        summary: "Upsert content progress",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "contentSlug", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  isCompleted: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: { 200: { description: "OK" }, 401: { description: "Unauthorized" } },
      },
    },
    "/sections/{sectionSlug}/boss": {
      get: {
        tags: ["Boss"],
        summary: "Get section boss detail",
        parameters: [{ name: "sectionSlug", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "OK" }, 404: { description: "Not found" } },
      },
    },
    "/boss/{bossSlug}/submit": {
      post: {
        tags: ["Boss"],
        summary: "Submit boss answer",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "bossSlug", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["answerText"],
                properties: {
                  answerText: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Created" }, 401: { description: "Unauthorized" } },
      },
    },
  },
};

function registerSwagger(app) {
  app.get("/docs-json", (req, res) => {
    res.status(200).json(openApiSpec);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
}

module.exports = {
  registerSwagger,
};
