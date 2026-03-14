import { createContext, useContext, useMemo, useCallback } from "react";
import { useUser } from "@clerk/react";

const RoleContext = createContext({
  role: "citizen",
  isAdmin: false,
  isCitizen: true,
  setRole: () => {},
});

export function RoleProvider({ children }) {
  const { user } = useUser();
  
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const email = user.primaryEmailAddress?.emailAddress;
    return typeof email === 'string' && email.endsWith("@iiitnr.edu.in");
  }, [user]);

  const role = isAdmin ? "admin" : "citizen";

  // Prevent UI errors if components still try to call setRole
  const setRole = useCallback(() => {
    console.warn("setRole is disabled: Role is strictly enforced by email domain.");
  }, []);

  const value = useMemo(() => ({
    role,
    isAdmin,
    isCitizen: !isAdmin,
    setRole,
  }), [role, isAdmin, setRole]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
