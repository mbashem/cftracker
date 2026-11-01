import { vi, type Mock } from "vitest";
import Theme, { ThemesType } from "../../src/util/Theme";
import type Problem from "../../src/types/CF/Problem";
import type Contest from "../../src/types/CF/Contest";
import type Submission from "../../src/types/CF/Submission";
import type { List, ListItem, ListWithItem } from "../../src/types/list";
import { createList, createListItem } from "./listFixtures";

interface FrontendMocks {
  problems: Problem[];
  submissions: Submission[];
  rawSubmissions: Submission[] | undefined;
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
  listsLoading: boolean;
  listsError: unknown;
  individualList: ListWithItem | undefined;
  individualListLoading: boolean;
  individualListError: unknown;
  handleGithubCallback: Mock<(code: string, state: string) => Promise<void>>;
  createList: Mock<(name: string) => Promise<List>>;
  updateListName: Mock<(id: number, name: string) => Promise<void>>;
  deleteList: Mock<(id: number) => Promise<void>>;
  addProblemToList: Mock<(id: number, problemId: string, position: number) => Promise<ListItem>>;
  deleteProblemFromList: Mock<(id: number, problemId: string) => Promise<void>>;
  changeThemeMod: Mock<(theme: ThemesType) => void>;
  updateUsers: Mock<(handles: string) => void>;
  syncUserSubmissions: Mock<(wait?: boolean) => void>;
  logout: Mock<() => void>;
  showErrorToast: Mock<(message: string) => void>;
  showGeneralToast: Mock<(message: string) => void>;
  getListWithItems: Mock<(id: number) => Promise<ListWithItem>>;
}

// Fresh defaults shared by initialization and per-test reset.
const createFrontendState = vi.hoisted(() => () => ({
  problems: [] as Problem[],
  submissions: [] as Submission[],
  rawSubmissions: undefined as Submission[] | undefined,
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
  listsLoading: false,
  listsError: undefined as unknown,
  individualList: undefined as ListWithItem | undefined,
  individualListLoading: false,
  individualListError: undefined as unknown,
}));

// Shared dependency mocks for page, navigation, menu, and list tests.
const frontend: FrontendMocks = vi.hoisted(() => ({
  ...createFrontendState(),
  handleGithubCallback: vi.fn(),
  createList: vi.fn(), updateListName: vi.fn(), deleteList: vi.fn(),
  addProblemToList: vi.fn(), deleteProblemFromList: vi.fn(),
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
    submissions: frontend.submissions, rawSubmissions: frontend.rawSubmissions ?? frontend.submissions,
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
    useGetAllListsQuery: () => ({ data: frontend.lists, isLoading: frontend.listsLoading, error: frontend.listsError }),
    useGetListQuery: () => ({ data: frontend.individualList, isLoading: frontend.individualListLoading, error: frontend.individualListError }),
    createList: frontend.createList, updateListName: frontend.updateListName, deleteList: frontend.deleteList,
    addProblemToList: frontend.addProblemToList, deleteProblemFromList: frontend.deleteProblemFromList,
    getListWithItems: frontend.getListWithItems,
  }),
}));
vi.mock("../../src/hooks/useToast", () => ({
  default: () => ({ showErrorToast: frontend.showErrorToast, showGeneralToast: frontend.showGeneralToast }),
}));
vi.mock("../../src/data/hooks/useUserStore", () => ({
  default: () => ({
    userList: {
      handles: frontend.handles, id: frontend.userId,
      authenticationStatus: frontend.authenticated ? 'authenticated' : 'unauthenticated',
      user: frontend.authenticated ? { id: frontend.userId, jwtToken: `session-${frontend.userId}` } : undefined,
    },
    updateUsers: frontend.updateUsers, syncUserSubmissions: frontend.syncUserSubmissions,
  }),
}));
vi.mock("../../src/hooks/useUser", () => ({
  default: () => ({ isAuthenticated: frontend.authenticated, logout: frontend.logout, handleGithubCallback: frontend.handleGithubCallback }),
}));
vi.mock("../../src/util/env", () => ({
  get IS_BACKEND_AVAILABLE() { return frontend.backendAvailable; },
  BACKEND_API_URL: "https://backend.example.test/api/v1",
  IS_DEBUG_MODE: false,
}));

export function resetFrontendMocks() {
  Object.assign(frontend, createFrontendState());
  frontend.theme = new Theme(ThemesType.LIGHT);
  frontend.handleGithubCallback.mockReset().mockResolvedValue(undefined);
  frontend.createList.mockReset().mockImplementation(async name => createList({ name }));
  frontend.updateListName.mockReset().mockResolvedValue(undefined);
  frontend.deleteList.mockReset().mockResolvedValue(undefined);
  frontend.addProblemToList.mockReset().mockImplementation(async (listId, problemId, position) => createListItem({ listId, problemId, position }));
  frontend.deleteProblemFromList.mockReset().mockResolvedValue(undefined);
  frontend.changeThemeMod.mockReset();
  frontend.updateUsers.mockReset();
  frontend.syncUserSubmissions.mockReset();
  frontend.logout.mockReset();
  frontend.showErrorToast.mockReset();
  frontend.showGeneralToast.mockReset();
  frontend.getListWithItems.mockReset().mockImplementation(async id => createList({ id, name: "Test list" }));
}

export { frontend };
