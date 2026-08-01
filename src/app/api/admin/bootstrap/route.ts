import { ApiError, fail, ok } from "@/lib/api";
import { bootstrapAdministrator, hasValidBootstrapAuthorization } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    if (!hasValidBootstrapAuthorization(request.headers.get("authorization"))) {
      throw new ApiError("未授权。", 401, "UNAUTHORIZED");
    }
    const action = await bootstrapAdministrator();
    return ok({ action });
  } catch (error) {
    return fail(error);
  }
}
