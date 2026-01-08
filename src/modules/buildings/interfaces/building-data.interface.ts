/**
 * Interface for building data used in the service layer.
 * Represents the internal building data structure with proper TypeScript types.
 */
export interface BuildingData {
  id: string;
  cadastral_code: string;
  municipality_code: string;
  name?: string;
  building_type: string;
  address: string;
  geometry?: object;
  basic_data: object;
  visible: boolean;
  created_at: Date;
  updated_at?: Date;
  updated_by?: string;
}