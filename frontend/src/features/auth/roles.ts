import type { AuthUser } from "@/types/live";

export function normalizeAuthRole(role?: string | null) {
  return role?.trim().toLowerCase() ?? "";
}

export function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    role: normalizeAuthRole(user.role),
  };
}

export function isRoleAllowed(role: string | null | undefined, allowedRoles: string[]) {
  const normalizedRole = normalizeAuthRole(role);
  return allowedRoles.some((allowedRole) => normalizeAuthRole(allowedRole) === normalizedRole);
}

export function getRoleHome(role?: string | null) {
  switch (normalizeAuthRole(role)) {
    case "admin":
    case "curator":
      return "/admin";
    case "professor":
      return "/teacher";
    case "student":
      return "/aluno";
    case "guardian":
      return "/profile";
    default:
      return "/profile";
  }
}

export function getRoleNavigationLabel(role?: string | null) {
  switch (normalizeAuthRole(role)) {
    case "admin":
      return "Administração";
    case "curator":
      return "Curadoria";
    case "professor":
      return "Sala do professor";
    case "student":
      return "Área do aluno";
    case "guardian":
      return "Perfil";
    default:
      return "Minha conta";
  }
}
