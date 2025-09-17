/* eslint-disable */

export interface Structure {
    structure_name: string;
    field_name: string;
    file_path: string;
    wells_count: number;
    wells: string[];
    total_records: number;
    columns: string[];
    error?: string;
}

export interface Field {
    field_name: string;
    structures_count: number;
    structures: Structure[];
}

export interface Well {
    well_name: string;
    fields: string[];
    structures: { field_name: string; structure_name: string }[];
    fields_count: number;
    structures_count: number;
}

export interface StructuresData {
    fields: Field[];
    structures: Structure[];
    wells: Well[];
    summary: {
        total_fields: number;
        total_structures: number;
        total_wells: number;
        total_records: number;
    };
}

// Backend response types that match your Python backend
export interface FieldDetails {
    field_name: string;
    structures: {
        structure_name: string;
        file_path: string;
        wells: string[];
        wells_count: number;
        total_records: number;
        columns: string[];
        sample_data: any[];
        error?: string;
    }[];
    total_wells: number;
    total_records: number;
    all_wells: string[];
}

export interface StructureDetails {
    field_name: string;
    structure_name: string;
    file_path: string;
    wells: string[];
    wells_count: number;
    total_records: number;
    columns: string[];
    statistics: Record<string, {
        mean?: number;
        min?: number;
        max?: number;
        count: number;
    }>;
    sample_data: any[];
    data_types: Record<string, string>;
}

export interface WellDetails {
    well_name: string;
    found_in: {
        field_name: string;
        structure_name: string;
        records_count: number;
        sample_data: any[];
    }[];
    total_records: number;
    fields: string[];
    structures: { field_name: string; structure_name: string }[];
}
