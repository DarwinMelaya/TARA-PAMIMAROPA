declare module 'select-philippines-address' {
    export type PhProvince = {
        psgc_code: string;
        province_name: string;
        province_code: string;
        region_code: string;
    };

    export type PhCity = {
        city_name: string;
        city_code: string;
        province_code: string;
        region_desc: string;
    };

    export type PhBarangay = {
        brgy_name: string;
        brgy_code: string;
        province_code: string;
        region_code: string;
    };

    /** Resolves to an error message string instead of rejecting on failure. */
    export function provinces(
        regionCode: string,
    ): Promise<PhProvince[] | string>;
    export function cities(provinceCode: string): Promise<PhCity[] | string>;
    export function barangays(cityCode: string): Promise<PhBarangay[] | string>;
}
