import { createContext, useContext, useMemo, useState, useCallback } from "react";

const RoleContext = createContext({
  role: "citizen",
  isAdmin: false,
  isCitizen: true,
  setRole: () => {},
});

const ROLE_STORAGE_KEY = "netra_user_role";

export function RoleProvider({ children }) {
  // Read initial role from localStorage (persists across sessions)
  const [role, setRoleState] = useState(() => {
    try {
      return localStorage.getItem(ROLE_STORAGE_KEY) || "citizen";
    } catch {
      return "citizen";
    }
  });

  const setRole = useCallback((newRole) => {
    const r = newRole === "admin" ? "admin" : "citizen";
    setRoleState(r);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, r);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const value = useMemo(() => ({
    role,
    isAdmin: role === "admin",
    isCitizen: role !== "admin",
    setRole,
  }), [role, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
