import { createAPIFileRoute } from "@tanstack/react-start/server";
import { analyzeCode, checkSyntax, generateReport } from "../../backend/src/lib/api-handlers";

export const APIRoute = createAPIFileRoute("/api/analyze")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { code, tempo } = body;

      // Check syntax first
      const syntaxCheck = checkSyntax(code);
      if (!syntaxCheck.valid) {
        return Response.json(
          {
            success: false,
            error: "Syntax errors detected",
            details: syntaxCheck.errors,
          },
          { status: 400 }
        );
      }

      // Analyze and generate music
      const result = await analyzeCode({ code, tempo });

      if (!result.success) {
        return Response.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      // Generate report
      const report = generateReport(
        result.data!.parseResult,
        code.split("\n").length
      );

      return Response.json({
        success: true,
        data: {
          parseResult: result.data.parseResult,
          composition: result.data.composition,
          report,
          syntaxWarnings: syntaxCheck.warnings,
        },
      });
    } catch (error) {
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  },
});
