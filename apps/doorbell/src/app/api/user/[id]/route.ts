import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-helpers";
import { registrationSchema } from "@/lib/schemas";
import { UserService } from "@/lib/services/user-service";

export const runtime = "nodejs";

// PUT - Atualizar usuário
export async function PUT(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    // Verificar autenticação
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = parseInt(params.id);
    const sessionUserId = parseInt(authUser.userId.toString());

    // Verificar se o usuário pode editar este cadastro
    if (userId !== sessionUserId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await req.json();
    console.log("API User Update: Body received", body);

    // Validar dados sem password
    const editSchema = registrationSchema.omit({ password: true });
    const validatedData = editSchema.parse(body);
    console.log("API User Update: Data validated", validatedData);

    // Atualizar usuário usando service
    const result = await UserService.updateUser(userId, validatedData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Usuário atualizado com sucesso",
      user: {
        id: result.user!.id,
        name: result.user!.name,
        email: result.user!.email,
        phone: result.user!.phone,
        cpf: result.user!.cpf,
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar usuário:", error);

    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
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
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// GET - Buscar dados do usuário
export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    // Verificar autenticação
    const authUser = await getAuthUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = parseInt(params.id);
    const sessionUserId = parseInt(authUser.userId.toString());

    // Verificar se o usuário pode acessar este cadastro
    if (userId !== sessionUserId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Buscar usuário
    const user = await UserService.findUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Retornar dados sem senha
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        cpf: user.cpf,
        address: user.address,
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar usuário:", error);

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
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
