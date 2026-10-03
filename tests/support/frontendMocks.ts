import { vi, type Mock } from "vitest";
import Theme, { ThemesType } from "../../src/util/Theme";
import type Problem from "../../src/types/CF/Problem";
import type Contest from "../../src/types/CF/Contest";
import type Submission from "../../src/types/CF/Submission";
import type { ListWithItem } from "../../src/types/list";

interface FrontendMocks {
  problems: Problem[];
  submissions: Submission[];
  contests: Contest[];
  loading: boolean;
  contestLoading: boolean | undefined;
  problemError: string | undefined;
  contestError: string | undefined;
  submissionError: string | undefined;
  theme: Theme | undefined;
  handles: string[];
  userId: number;
  authenticated: boolean;
  backendAvailable: boolean;
  lists: ListWithItem[];
  changeThemeMod: Mock<(theme: ThemesType) => void>;
  updateUsers: Mock<(handles: string) => void>;
  syncUserSubmissions: Mock<(wait?: boolean) => void>;
  logout: Mock<() => void>;
  showErrorToast: Mock<(message: string) => void>;
  showGeneralToast: Mock<(message: string) => void>;
  getListWithItems: Mock<(id: number) => Promise<ListWithItem>>;
}

// Shared dependency mocks for page, navigation, menu, and list tests.
const frontend: FrontendMocks = vi.hoisted(() => ({
  problems: [] as Problem[],
  submissions: [] as Submission[],
  contests: [] as Contest[],
  loading: false,
  contestLoading: undefined as boolean | undefined,
  problemError: undefined as string | undefined,
  contestError: undefined as string | undefined,
  submissionError: undefined as string | undefined,
  theme: undefined as Theme | undefined,
  handles: [] as string[],
  userId: 1,
  authenticated: false,
  backendAvailable: false,
  lists: [] as ListWithItem[],
  changeThemeMod: vi.fn(),
  updateUsers: vi.fn(),
  syncUserSubmissions: vi.fn(),
  logout: vi.fn(),
  showErrorToast: vi.fn(),
  showGeneralToast: vi.fn(),
  getListWithItems: vi.fn<(id: number) => Promise<ListWithItem>>(),
}));

vi.mock("../../src/data/hooks/useSubmissionsStore", () => ({
  default: () => ({
    submissions: frontend.submissions, rawSubmissions: frontend.submissions,
    loading: 0, error: frontend.submissionError,
  }),
}));
vi.mock("../../src/data/hooks/useTheme", () => ({
  default: () => ({ theme: frontend.theme, changeThemeMod: frontend.changeThemeMod }),
}));
vi.mock("../../src/data/hooks/useProblemsStore", () => ({
  default: () => ({
    problemList: {
      problems: frontend.problems,
      tags: [...new Set(frontend.problems.flatMap((problem) => problem.tags))],
      loading: frontend.loading, error: frontend.problemError,
    },
    problemsById: new Map(frontend.problems.map((problem) => [problem.id, problem])),
    isProblemListLoading: frontend.loading, problemListError: frontend.problemError,
  }),
}));
vi.mock("../../src/data/hooks/useContestStore", () => ({
  default: () => ({
    contests: frontend.contests,
    loading: frontend.contestLoading ?? frontend.loading,
    isContestListLoading: frontend.contestLoading ?? frontend.loading,
    error: frontend.contestError, contestListError: frontend.contestError,
  }),
}));
vi.mock("../../src/data/hooks/useAppStateStore", () => ({
  default: () => ({ appState: { minRating: 0, maxRating: 4000, minContestId: 1, maxContestId: 20000 } }),
}));
vi.mock("../../src/data/hooks/useListApi", () => ({
  default: () => ({
    useGetAllListsQuery: () => ({ data: frontend.lists }),
    getListWithItems: frontend.getListWithItems,
  }),
}));
vi.mock("../../src/hooks/useToast", () => ({
  default: () => ({ showErrorToast: frontend.showErrorToast, showGeneralToast: frontend.showGeneralToast }),
}));
vi.mock("../../src/data/hooks/useUserStore", () => ({
  default: () => ({
    userList: { handles: frontend.handles, id: frontend.userId },
    updateUsers: frontend.updateUsers, syncUserSubmissions: frontend.syncUserSubmissions,
  }),
}));
vi.mock("../../src/hooks/useUser", () => ({
  default: () => ({ isAuthenticated: frontend.authenticated, logout: frontend.logout }),
}));
vi.mock("../../src/util/env", () => ({
  get IS_BACKEND_AVAILABLE() { return frontend.backendAvailable; },
  BACKEND_API_URL: "https://backend.example.test",
  IS_DEBUG_MODE: false,
}));

export function resetFrontendMocks() {
  frontend.problems = [];
  frontend.submissions = [];
  frontend.contests = [];
  frontend.loading = false;
  frontend.contestLoading = undefined;
  frontend.problemError = undefined;
  frontend.contestError = undefined;
  frontend.submissionError = undefined;
  frontend.theme = new Theme(ThemesType.LIGHT);
  frontend.handles = [];
  frontend.userId = 1;
  frontend.authenticated = false;
  frontend.backendAvailable = false;
  frontend.lists = [];
  frontend.changeThemeMod.mockReset();
  frontend.updateUsers.mockReset();
  frontend.syncUserSubmissions.mockReset();
  frontend.logout.mockReset();
  frontend.showErrorToast.mockReset();
  frontend.showGeneralToast.mockReset();
  frontend.getListWithItems.mockReset().mockImplementation(async (id) => ({
    id, userId: 1, name: "Test list", createdAt: "2026-01-01", items: [],
  }));
}

export { frontend };

// The spinner package's styled-components CJS/ESM boundary cannot load in jsdom.
// Keep its accessibility/visibility contract; spinner animation is a browser check.
vi.mock("react-loader-spinner", async () => {
  const { createElement } = await import("react");
  return {
    ThreeDots: ({ ariaLabel, visible }: { ariaLabel: string; visible: boolean }) =>
      visible ? createElement("div", { "aria-label": ariaLabel }) : null,
  };
});
