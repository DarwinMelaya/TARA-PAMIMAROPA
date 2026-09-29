import { useEffect, useState } from 'react';
import { barangays, cities, provinces } from 'select-philippines-address';
import type { Province } from '@/constants/taraProjects';

/** PSGC region code for MIMAROPA (Region IV-B). */
const MIMAROPA_REGION_CODE = '17';

/** PSGC names that differ from the city names already stored on projects. */
const NAME_OVERRIDES: Record<string, string> = {
    'Abra De Ilog': 'Abra de Ilog',
    'City Of Calapan': 'Calapan City',
    'Puerto Princesa City': 'Puerto Princesa',
};

export type LocationOption = { name: string; code: string };

type State =
    | { status: 'idle' | 'loading' | 'error'; options: LocationOption[] }
    | { status: 'ready'; options: LocationOption[] };

const normalizeCityName = (psgcName: string): string => {
    const base = psgcName.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    return NAME_OVERRIDES[base] ?? base;
};

const unwrap = <T>(result: T[] | string): T[] => {
    if (typeof result === 'string') throw new Error(result);
    return result;
};

const byName = (a: LocationOption, b: LocationOption) =>
    a.name.localeCompare(b.name);

const loadMunicipalities = async (
    province: string,
): Promise<LocationOption[]> => {
    const regionProvinces = unwrap(await provinces(MIMAROPA_REGION_CODE));
    const match = regionProvinces.find((p) => p.province_name === province);
    if (!match) throw new Error(`${province} is not in MIMAROPA.`);

    const list = unwrap(await cities(match.province_code));
    return list
        .map((city) => ({
            name: normalizeCityName(city.city_name),
            code: city.city_code,
        }))
        .sort(byName);
};

const loadBarangays = async (cityCode: string): Promise<LocationOption[]> =>
    unwrap(await barangays(cityCode))
        .map((brgy) => ({ name: brgy.brgy_name, code: brgy.brgy_code }))
        .sort(byName);

const cache = new Map<string, Promise<LocationOption[]>>();

const cached = (
    key: string,
    load: () => Promise<LocationOption[]>,
): Promise<LocationOption[]> => {
    let pending = cache.get(key);
    if (!pending) {
        pending = load();
        pending.catch(() => cache.delete(key));
        cache.set(key, pending);
    }
    return pending;
};

const useLocationOptions = (
    key: string | null,
    load: () => Promise<LocationOption[]>,
): State => {
    const [state, setState] = useState<State>({ status: 'idle', options: [] });

    useEffect(() => {
        if (!key) {
            setState({ status: 'idle', options: [] });
            return;
        }

        let active = true;
        setState({ status: 'loading', options: [] });

        cached(key, load).then(
            (options) => {
                if (active) setState({ status: 'ready', options });
            },
            () => {
                if (active) setState({ status: 'error', options: [] });
            },
        );

        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return state;
};

export const useMunicipalities = (province: Province): State =>
    useLocationOptions(`city:${province}`, () => loadMunicipalities(province));

/** The upstream barangay file is ~5 MB, so only fetch once a municipality is chosen. */
export const useBarangays = (cityCode: string | null): State =>
    useLocationOptions(cityCode ? `brgy:${cityCode}` : null, () =>
        loadBarangays(cityCode ?? ''),
    );
