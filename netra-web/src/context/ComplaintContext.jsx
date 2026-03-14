import { createContext, useContext, useState, useCallback } from "react";

const ComplaintContext = createContext();

export function ComplaintProvider({ children }) {
  const [citizenComplaints, setCitizenComplaints] = useState([]);
  const [citizenPotholes, setCitizenPotholes] = useState([]);

  const addComplaint = useCallback((complaint) => {
    setCitizenComplaints((prev) => [complaint, ...prev]);
  }, []);

  const addPothole = useCallback((pothole) => {
    setCitizenPotholes((prev) => [pothole, ...prev]);
  }, []);

  return (
    <ComplaintContext.Provider value={{ citizenComplaints, addComplaint, citizenPotholes, addPothole }}>
      {children}
    </ComplaintContext.Provider>
  );
}

export function useComplaints() {
  return useContext(ComplaintContext);
}
