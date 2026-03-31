import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: "ADMIN" | "CLIENT";
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: "ADMIN" | "CLIENT";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "CLIENT";
  }
}
