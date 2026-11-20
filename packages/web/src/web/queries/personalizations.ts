import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api";
export type Personalization = Awaited<ReturnType<typeof client.personalizations.get>>;
export type AdminPersonalization = Awaited<ReturnType<typeof client.personalizations.list>>[number];
export const personalizationsKey = ["admin", "personalizations"] as const;
export const useCreatePersonalization = () => useMutation({ mutationFn: (data: Parameters<typeof client.personalizations.create>[0]) => client.personalizations.create(data) });
export const usePersonalization = (code: string) => useQuery({ queryKey: ["personalization", code], queryFn: () => client.personalizations.get({ code }), enabled: !!code, retry: false });
export const usePersonalizations = (enabled: boolean) => useQuery({ queryKey: personalizationsKey, queryFn: () => client.personalizations.list(), enabled, refetchInterval: 2000, refetchIntervalInBackground: true });
export const usePersonalizationLookup = () => useMutation({ mutationFn: (code: string) => client.personalizations.lookup({ code }) });
export const usePersonalizationExport = () => useMutation({ mutationFn: (input: Parameters<typeof client.personalizations.exportSvg>[0]) => client.personalizations.exportSvg(input) });
export function usePersonalizationUpdate() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: Parameters<typeof client.personalizations.update>[0]) => client.personalizations.update(input), onSuccess: () => qc.invalidateQueries({ queryKey: personalizationsKey }) });
}
export const usePersonalizationAuth = () => useQuery({ queryKey: ["personalizations", "auth"], queryFn: () => client.admin.me(), retry: false });
export const usePersonalizationPresets = (enabled:boolean) => useQuery({queryKey:["personalization-presets"],queryFn:()=>client.personalizations.presets(),enabled});
export const usePersonalizationZip = () => useMutation({mutationFn:(codes:string[])=>client.personalizations.exportZip({codes})});
export function usePersonalizationDelete(){const qc=useQueryClient();return useMutation({mutationFn:(code:string)=>client.personalizations.delete({code,confirmed:true}),onSuccess:()=>qc.invalidateQueries({queryKey:personalizationsKey})});}
export function usePersonalizationSavePreset(){const qc=useQueryClient();return useMutation({mutationFn:(input:Parameters<typeof client.personalizations.savePreset>[0])=>client.personalizations.savePreset(input),onSuccess:()=>qc.invalidateQueries({queryKey:["personalization-presets"]})});}