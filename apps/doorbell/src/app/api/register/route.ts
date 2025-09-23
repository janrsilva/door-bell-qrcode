import { NextRequest, NextResponse } from "next/server";
import { registrationSchema } from "@/lib/schemas";
import { UserService } from "@/lib/services/user-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate the request body
    const validatedData = registrationSchema.parse(body);

    // Create user using service
    const result = await UserService.createUser(validatedData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Usuário cadastrado com sucesso",
      userId: result.user!.id,
      addressUuid: result.user!.address.addressUuid,
    });
  } catch (error: any) {
    console.error("Erro ao cadastrar usuário:", error);

    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 },
      );
    }

    // In development, return detailed error information
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        {
          error: "Erro interno do servidor",
          details: {
            message: error.message,
            code: error.code,
            stack: error.stack,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
