// Provider ID Profile Types

export interface ProviderProfile {
  account_id: string;
  hash_cid: string;
  provider_id: string;
  title_th: string;
  special_title_th: string;
  name_th: string;
  name_eng: string;
  created_at: string;
  title_en: string;
  special_title_en: string;
  firstname_th: string;
  lastname_th: string;
  firstname_en: string;
  lastname_en: string;
  email: string;
  date_of_birth: string;
  organization: Organization[];
}

export interface Organization {
  business_id: string;
  position: string;
  position_id: string;
  affiliation: string;
  license_id: string | null;
  hcode: string;
  code9: string;
  hcode9: string;
  level: string;
  hname_th: string;
  hname_eng: string;
  tax_id: string;
  license_expired_date: string | null;
  license_id_verify: boolean;
  expertise: string | null;
  expertise_id: string | null;
  moph_station_ref_code: string | null;
  is_private_provider: boolean;
  address: Address;
  position_type: string;
}

export interface Address {
  address: string | null;
  moo: string | null;
  building: string | null;
  soi: string | null;
  street: string | null;
  province: string;
  district: string;
  sub_district: string;
  zip_code: string;
}

export interface ProviderProfileResponse {
  status: boolean;
  message: string;
  data: ProviderProfile;
}









