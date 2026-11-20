import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../lib/api";

// ---------- chaves ----------
const K = {
  me: ["studio", "me"] as const,
  options: ["studio", "options"] as const,
  projects: ["studio", "projects"] as const,
  project: (id: number) => ["studio", "project", id] as const,
  quickProject: ["studio", "quick-project"] as const,
  users: ["studio", "owner", "users"] as const,
  allProjects: ["studio", "owner", "projects"] as const,
  styles: ["studio", "owner", "styles"] as const,
  mockups: ["studio", "owner", "mockups"] as const,
  feedbacks: ["studio", "owner", "feedbacks"] as const,
  report: ["studio", "owner", "report"] as const,
};

// ---------- usuário logado ----------
export function useStudioMe(enabled: boolean) {
  return useQuery({
    queryKey: K.me,
    queryFn: () => client.studio.me(),
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useStudioOptions(enabled: boolean) {
  return useQuery({
    queryKey: K.options,
    queryFn: () => client.studio.options(),
    enabled,
    staleTime: 60_000,
  });
}

export function useStudioLogin() {
  return useMutation({
    mutationFn: (input: { email: string; password: string }) => client.studio.login(input),
  });
}

export function useStudioChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      client.studio.changePassword(input),
  });
}

// ---------- projetos ----------
export function useStudioProjects(enabled: boolean) {
  return useQuery({
    queryKey: K.projects,
    queryFn: () => client.studio.projects(),
    enabled,
    staleTime: 10_000,
  });
}

export function useStudioProject(id: number | null) {
  return useQuery({
    queryKey: K.project(id ?? 0),
    queryFn: () => client.studio.project({ id: id! }),
    enabled: id != null,
    staleTime: 5_000,
  });
}

export function useStudioQuickProject(enabled: boolean) {
  return useQuery({
    queryKey: K.quickProject,
    queryFn: () => client.studio.quickProject(),
    enabled,
    staleTime: 5_000,
  });
}

function useInvalidateProjects() {
  const qc = useQueryClient();
  return (id?: number) => {
    qc.invalidateQueries({ queryKey: K.projects });
    qc.invalidateQueries({ queryKey: K.me });
    qc.invalidateQueries({ queryKey: K.quickProject });
    if (id != null) qc.invalidateQueries({ queryKey: K.project(id) });
  };
}

export function useCreateStudioProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.studio.createProject>[0]) =>
      client.studio.createProject(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateStudioProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.studio.updateProject>[0]) =>
      client.studio.updateProject(input),
    onSuccess: (_d, vars) => invalidate(vars.id),
  });
}

export function useDuplicateStudioProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (id: number) => client.studio.duplicateProject({ id }),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteStudioProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (id: number) => client.studio.deleteProject({ id }),
    onSuccess: () => invalidate(),
  });
}

// ---------- imagens ----------
export function useAddStudioImage() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (input: { projectId: number; key: string }) => client.studio.addImage(input),
    onSuccess: (_d, vars) => invalidate(vars.projectId),
  });
}

export function useDeleteStudioImage(projectId: number | null) {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (id: number) => client.studio.deleteImage({ id }),
    onSuccess: () => invalidate(projectId ?? undefined),
  });
}

export function useStudioGenerate() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: (input: {
      projectId: number;
      styleSlug?: string | null;
      customPrompt?: string | null;
      imageIds: number[];
    }) => client.studio.generate(input),
    onSuccess: (_d, vars) => invalidate(vars.projectId),
  });
}

// ---------- feedback ----------
export function useSendStudioFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.studio.sendFeedback>[0]) =>
      client.studio.sendFeedback(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: K.feedbacks }),
  });
}

// ================= Proprietário =================
export function useStudioUsers(enabled: boolean) {
  return useQuery({
    queryKey: K.users,
    queryFn: () => client.studioOwner.users(),
    enabled,
    staleTime: 10_000,
  });
}

export function useStudioAllProjects(enabled: boolean) {
  return useQuery({
    queryKey: K.allProjects,
    queryFn: () => client.studioOwner.allProjects(),
    enabled,
    staleTime: 10_000,
  });
}

export function useStudioStyles(enabled: boolean) {
  return useQuery({
    queryKey: K.styles,
    queryFn: () => client.studioOwner.styles(),
    enabled,
    staleTime: 30_000,
  });
}

export function useStudioMockups(enabled: boolean) {
  return useQuery({
    queryKey: K.mockups,
    queryFn: () => client.studioOwner.mockups(),
    enabled,
    staleTime: 30_000,
  });
}

export function useStudioFeedbacks(enabled: boolean) {
  return useQuery({
    queryKey: K.feedbacks,
    queryFn: () => client.studioOwner.feedbacks(),
    enabled,
    staleTime: 10_000,
  });
}

export function useStudioReport(enabled: boolean) {
  return useQuery({
    queryKey: K.report,
    queryFn: () => client.studioOwner.report(),
    enabled,
    staleTime: 10_000,
  });
}

function useInvalidateOwner() {
  const qc = useQueryClient();
  return () => {
    for (const key of [K.users, K.allProjects, K.styles, K.mockups, K.feedbacks, K.report, K.options])
      qc.invalidateQueries({ queryKey: key });
  };
}

export function useSaveStudioUser() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (
      input: { id?: number } & Record<string, unknown>,
    ): Promise<{ id: number; name: string }> =>
      input.id != null
        ? client.studioOwner.updateUser(input as Parameters<typeof client.studioOwner.updateUser>[0])
        : client.studioOwner.createUser(
            input as Parameters<typeof client.studioOwner.createUser>[0],
          ),
    onSuccess: invalidate,
  });
}

export function useDeleteStudioUser() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (id: number) => client.studioOwner.deleteUser({ id }),
    onSuccess: invalidate,
  });
}

export function useSaveStudioStyle() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.studioOwner.saveStyle>[0]) =>
      client.studioOwner.saveStyle(input),
    onSuccess: invalidate,
  });
}

export function useDeleteStudioStyle() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (id: number) => client.studioOwner.deleteStyle({ id }),
    onSuccess: invalidate,
  });
}

export function useSaveStudioSize() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.studioOwner.saveSize>[0]) =>
      client.studioOwner.saveSize(input),
    onSuccess: invalidate,
  });
}

export function useDeleteStudioSize() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (id: number) => client.studioOwner.deleteSize({ id }),
    onSuccess: invalidate,
  });
}

export function useSaveStudioProduct() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.studioOwner.saveProduct>[0]) =>
      client.studioOwner.saveProduct(input),
    onSuccess: invalidate,
  });
}

export function useDeleteStudioProduct() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (id: number) => client.studioOwner.deleteProduct({ id }),
    onSuccess: invalidate,
  });
}

export function useSaveStudioMockup() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (input: Parameters<typeof client.studioOwner.saveMockup>[0]) =>
      client.studioOwner.saveMockup(input),
    onSuccess: invalidate,
  });
}

export function useDeleteStudioMockup() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (id: number) => client.studioOwner.deleteMockup({ id }),
    onSuccess: invalidate,
  });
}

export function useDeleteStudioFeedback() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: (id: number) => client.studioOwner.deleteFeedback({ id }),
    onSuccess: invalidate,
  });
}
