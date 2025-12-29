/**
 * Internal interface for building data returned from database queries.
 * Used by services for type safety and business logic operations.
 */
export interface BuildingData {
  id: string;
  cadastral_code: string;
  municipality_code: string;
  name: string | null;
  building_type: string;
  address: string;
  geom: { type: 'Point'; coordinates: [number, number] } | null;
  basic_data: Record<string, unknown>;
  visible: boolean;
  created_at: Date;
  updated_at: Date | null;
  updated_by: string | null;
}