export interface PatientEvent {
  id: string;
  patient_id: string;
  source: "poke_text" | "poke_scheduled" | "zingage_call" | "vision_analysis" | string;
  type: "checkin" | "symptom" | "weekly_summary" | "flag_doctor" | string;
  payload: Record<string, any>;
  created_at: string; // ISO timestamp
}
