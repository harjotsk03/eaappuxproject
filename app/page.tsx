"use client";
import Image, { type StaticImageData } from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRightFromLine, Bell, Heart, ShoppingCart } from "lucide-react";
import linkIconImage from "../linkicon.png";
import psIconImage from "../psicon.png";
import simsCover from "../simscover.jpeg";
import nhlCover from "../nhlcover.jpg";
import fcCover from "../eacover.webp";
import ufcCover from "../ufc cover.avif";
import steamIconImage from "../steamicon.png";
import xboxIconImage from "../xboxicon.png";

type Game = {
  id: string;
  title: string;
  subtitle: string;
  cover: StaticImageData;
  hoursPlayed: string;
  hoursPlayedValue: number;
  lastPlayed: string;
  lastPlayedOrder: number;
  needsInstall: boolean;
  favorite: boolean;
  hidden: boolean;
  friendsPlaying: number;
  achievementsComplete: number;
  releaseDateOrder: number;
  dateAddedOrder: number;
  sizeOnDiskGb: number;
  metacriticScore: number;
  steamReviewScore: number;
};

type LibraryView = "all" | "favorites" | "hidden";

type ToastMessage = {
  id: number;
  message: string;
  undoLabel: string;
  onUndo: () => void;
};

type TourTarget =
  | "library"
  | "filters"
  | "left-nav"
  | "cards"
  | "card-menu"
  | "sidebar-menu"
  | "toast";

type TourStep = {
  target: TourTarget;
  eyebrow: string;
  title: string;
  body: string;
  hint: string;
};

const sortOptions = ["Alphabetical", "Hours Played", "Last Played"] as const;

type SortOption = (typeof sortOptions)[number];

const initialGames: Game[] = [
  {
    id: "sims-4",
    title: "The Sims\u2122 4",
    subtitle: "Life simulation",
    cover: simsCover,
    hoursPlayed: "128 hrs",
    hoursPlayedValue: 128,
    lastPlayed: "Last played 2 days ago",
    lastPlayedOrder: 2,
    needsInstall: false,
    favorite: false,
    hidden: false,
    friendsPlaying: 4,
    achievementsComplete: 72,
    releaseDateOrder: 20140902,
    dateAddedOrder: 20260501,
    sizeOnDiskGb: 26,
    metacriticScore: 70,
    steamReviewScore: 88,
  },
  {
    id: "nhl-25",
    title: "NHL 25",
    subtitle: "Ice hockey",
    cover: nhlCover,
    hoursPlayed: "42 hrs",
    hoursPlayedValue: 42,
    lastPlayed: "Last played yesterday",
    lastPlayedOrder: 1,
    needsInstall: false,
    favorite: false,
    hidden: false,
    friendsPlaying: 2,
    achievementsComplete: 44,
    releaseDateOrder: 20241004,
    dateAddedOrder: 20260503,
    sizeOnDiskGb: 58,
    metacriticScore: 78,
    steamReviewScore: 74,
  },
  {
    id: "ufc-5",
    title: "UFC 5",
    subtitle: "Mixed martial arts",
    cover: ufcCover,
    hoursPlayed: "19 hrs",
    hoursPlayedValue: 19,
    lastPlayed: "Last played 5 days ago",
    lastPlayedOrder: 5,
    needsInstall: true,
    favorite: false,
    hidden: false,
    friendsPlaying: 1,
    achievementsComplete: 31,
    releaseDateOrder: 20231027,
    dateAddedOrder: 20260504,
    sizeOnDiskGb: 47,
    metacriticScore: 79,
    steamReviewScore: 71,
  },
  {
    id: "fc-25",
    title: "EA SPORTS FC\u2122 25",
    subtitle: "Football",
    cover: fcCover,
    hoursPlayed: "86 hrs",
    hoursPlayedValue: 86,
    lastPlayed: "Last played today",
    lastPlayedOrder: 0,
    needsInstall: true,
    favorite: false,
    hidden: false,
    friendsPlaying: 6,
    achievementsComplete: 58,
    releaseDateOrder: 20240927,
    dateAddedOrder: 20260502,
    sizeOnDiskGb: 62,
    metacriticScore: 76,
    steamReviewScore: 68,
  },
];

const CARD_MENU_WIDTH = 236;
const MANAGE_MENU_WIDTH = 260;
const CARD_MENU_GAP = 12;
const VIEWPORT_GUTTER = 16;
const TOUR_SEEN_STORAGE_KEY = "ea-library-tour-seen";

const tourSteps: TourStep[] = [
  {
    target: "filters",
    eyebrow: "Find games fast",
    title: "Search and sort the library",
    body: "Search filters games by title or genre while the compact sort button switches between Alphabetical, Hours Played, and Last Played.",
    hint: "Try typing “FC” or sorting by Hours Played after the tour.",
  },
  {
    target: "left-nav",
    eyebrow: "Expandable categories",
    title: "All, Favorited, and Hidden tabs",
    body: "The left nav has independent category navigation and smooth dropdowns. Clicking the label changes the main view; clicking plus or minus expands the list. Each game row also supports right-click or control-click for the same manage menu as the main cards.",
    hint: "The left nav scrolls independently when every category is open.",
  },
  {
    target: "card-menu",
    eyebrow: "Power menu",
    title: "Right-click or control-click a card",
    body: "Use right-click or control-click on any game card to open the custom menu. Manage opens a submenu for hiding, privacy-style actions, and account options.",
    hint: "The menu flips left or right automatically so it never creates horizontal scroll.",
  },
  {
    target: "toast",
    eyebrow: "Safe actions",
    title: "Undo with animated toasts",
    body: "Favoriting or hiding a game triggers a smooth toast with Undo, so users can quickly reverse accidental actions.",
    hint: "Try hiding a game from Manage, then press Undo in the toast.",
  },
];

const tourPanelPositions: Record<
  TourTarget,
  { left: string; top: string; transform: string }
> = {
  library: {
    left: "calc(100vw - min(480px, calc(100vw - 56px)) - 112px)",
    top: "62px",
    transform: "translate3d(0, 0, 0)",
  },
  filters: {
    left: "50%",
    top: "154px",
    transform: "translate3d(-50%, 0, 0)",
  },
  "left-nav": {
    left: "calc(16.6667vw + 22px)",
    top: "220px",
    transform: "translate3d(0, 0, 0)",
  },
  cards: {
    left: "50%",
    top: "250px",
    transform: "translate3d(-35%, 0, 0)",
  },
  "card-menu": {
    left: "54%",
    top: "220px",
    transform: "translate3d(-15%, 0, 0)",
  },
  "sidebar-menu": {
    left: "calc(16.6667vw + 22px)",
    top: "360px",
    transform: "translate3d(0, 0, 0)",
  },
  toast: {
    left: "50%",
    top: "calc(100vh - 480px)",
    transform: "translate3d(-50%, 0, 0)",
  },
};

const tourSpotlights: Record<
  TourTarget,
  { left: string; top: string; width: string; height: string; radius: string }
> = {
  library: {
    left: "calc(16.6667vw + 32px)",
    top: "50px",
    width: "calc(83.3333vw - 128px)",
    height: "76px",
    radius: "22px",
  },
  filters: {
    left: "calc(16.6667vw + 40px)",
    top: "166px",
    width: "calc(83.3333vw - 136px)",
    height: "58px",
    radius: "18px",
  },
  "left-nav": {
    left: "8px",
    top: "128px",
    width: "calc(16.6667vw - 16px)",
    height: "calc(100vh - 148px)",
    radius: "24px",
  },
  cards: {
    left: "calc(16.6667vw + 38px)",
    top: "220px",
    width: "calc(83.3333vw - 132px)",
    height: "calc(100vh - 315px)",
    radius: "30px",
  },
  "card-menu": {
    left: "calc(16.6667vw + 38px)",
    top: "245px",
    width: "520px",
    height: "420px",
    radius: "30px",
  },
  "sidebar-menu": {
    left: "8px",
    top: "260px",
    width: "calc(16.6667vw + 300px)",
    height: "320px",
    radius: "26px",
  },
  toast: {
    left: "calc(50vw - 270px)",
    top: "calc(100vh - 92.5px)",
    width: "540px",
    height: "76px",
    radius: "24px",
  },
};

function sortGames(gamesToSort: Game[], sortOption: SortOption) {
  return [...gamesToSort].sort((a, b) => {
    switch (sortOption) {
      case "Hours Played":
        return b.hoursPlayedValue - a.hoursPlayedValue;
      case "Last Played":
        return a.lastPlayedOrder - b.lastPlayedOrder;
      case "Alphabetical":
      default:
        return a.title.localeCompare(b.title);
    }
  });
}

export default function Home() {
  const [games, setGames] = useState(initialGames);
  const [openCardMenuTitle, setOpenCardMenuTitle] = useState<string | null>(
    null,
  );
  const [libraryView, setLibraryView] = useState<LibraryView>("all");
  const [sortOption, setSortOption] = useState<SortOption>("Alphabetical");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allGamesExpanded, setAllGamesExpanded] = useState(true);
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [hiddenExpanded, setHiddenExpanded] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [showSkipTour, setShowSkipTour] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  const hiddenGames = games.filter((game) => game.hidden);
  const favoriteGames = games.filter((game) => game.favorite && !game.hidden);
  const visibleGames = games.filter((game) => {
    if (libraryView === "hidden") return game.hidden;
    if (libraryView === "favorites") return game.favorite && !game.hidden;
    return !game.hidden;
  });
  const searchedGames = visibleGames.filter((game) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return true;

    return `${game.title} ${game.subtitle}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const sortedGames = useMemo(
    () => sortGames(searchedGames, sortOption),
    [searchedGames, sortOption],
  );
  const pageTitle =
    libraryView === "hidden"
      ? "Hidden games"
      : libraryView === "favorites"
        ? "Favorited games"
        : "Library";
  const activeTourStep = tourActive ? tourSteps[tourStepIndex] : null;
  const isTourTarget = (target: TourTarget) =>
    activeTourStep?.target === target;

  const startTour = () => {
    setShowSkipTour(false);
    setTourStepIndex(0);
    setTourActive(true);
    setAllGamesExpanded(true);
    setFavoritesExpanded(true);
  };

  const closeTour = () => {
    setShowSkipTour(false);
    setTourActive(false);
  };

  const goToNextTourStep = () => {
    setTourStepIndex((currentStep) => {
      if (currentStep === tourSteps.length - 1) {
        setShowSkipTour(false);
        setTourActive(false);
        return currentStep;
      }

      return currentStep + 1;
    });
  };

  const goToPreviousTourStep = () => {
    setTourStepIndex((currentStep) => Math.max(0, currentStep - 1));
  };

  const dismissToast = () => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    setToastVisible(false);
    window.setTimeout(() => setToast(null), 220);
  };

  const showToast = (toastMessage: Omit<ToastMessage, "id">) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToastVisible(false);
    setToast({ ...toastMessage, id: Date.now() });
    window.requestAnimationFrame(() => setToastVisible(true));
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastVisible(false);
      window.setTimeout(() => setToast(null), 220);
      toastTimeoutRef.current = null;
    }, 5200);
  };

  const toggleFavorite = (gameId: string) => {
    const targetGame = games.find((game) => game.id === gameId);
    if (!targetGame) return;

    const nextFavorite = !targetGame.favorite;
    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === gameId ? { ...game, favorite: nextFavorite } : game,
      ),
    );
    showToast({
      message: nextFavorite
        ? `${targetGame.title} added to favorites`
        : `${targetGame.title} removed from favorites`,
      undoLabel: "Undo",
      onUndo: () => {
        setGames((currentGames) =>
          currentGames.map((game) =>
            game.id === gameId
              ? { ...game, favorite: targetGame.favorite }
              : game,
          ),
        );
      },
    });
  };

  const setGameHidden = (gameId: string, hidden: boolean) => {
    const targetGame = games.find((game) => game.id === gameId);
    if (!targetGame) return;

    setGames((currentGames) =>
      currentGames.map((game) =>
        game.id === gameId ? { ...game, hidden } : game,
      ),
    );
    if (!hidden) {
      setLibraryView("all");
    } else {
      setHiddenExpanded(false);
    }
    showToast({
      message: hidden
        ? `${targetGame.title} hidden`
        : `${targetGame.title} restored to library`,
      undoLabel: "Undo",
      onUndo: () => {
        setGames((currentGames) =>
          currentGames.map((game) =>
            game.id === gameId ? { ...game, hidden: targetGame.hidden } : game,
          ),
        );
      },
    });
  };

  useEffect(() => {
    const handleMenuState = (event: Event) => {
      const customEvent = event as CustomEvent<{
        title: string;
        isOpen: boolean;
      }>;

      if (customEvent.detail.isOpen) {
        setOpenCardMenuTitle(customEvent.detail.title);
      } else {
        setOpenCardMenuTitle((currentTitle) =>
          currentTitle === customEvent.detail.title ? null : currentTitle,
        );
      }
    };

    window.addEventListener("ea-card-menu-state", handleMenuState);

    return () => {
      window.removeEventListener("ea-card-menu-state", handleMenuState);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem(TOUR_SEEN_STORAGE_KEY) === "true") {
      return;
    }

    window.localStorage.setItem(TOUR_SEEN_STORAGE_KEY, "true");
    setShowSkipTour(true);
    setTourStepIndex(0);
    setTourActive(true);
    setAllGamesExpanded(true);
    setFavoritesExpanded(true);
  }, []);

  useEffect(() => {
    if (!tourActive || tourSteps[tourStepIndex]?.target !== "toast") return;

    showToast({
      message: "Demo toast: The Sims\u2122 4 hidden",
      undoLabel: "Undo",
      onUndo: () => undefined,
    });

    return () => {
      dismissToast();
    };
  }, [tourActive, tourStepIndex]);

  useEffect(() => {
    if (!tourActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeTour();
      }
      if (event.key === "ArrowRight") {
        goToNextTourStep();
      }
      if (event.key === "ArrowLeft") {
        goToPreviousTourStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tourActive]);

  return (
    <div className="flex h-screen w-full overflow-hidden text-[13px] text-zinc-300 bg-[#171b2a] select-none">
      {/* ============== LEFT SIDEBAR ============== */}
      <aside
        className={`flex h-screen w-1/6 min-h-0 shrink-0 flex-col bg-[#171b2a] transition-[box-shadow,filter] duration-300 ${
          isTourTarget("left-nav")
            ? "relative z-40 shadow-[0_0_0_2px_rgba(39,106,252,0.9),0_0_60px_rgba(39,106,252,0.38)]"
            : ""
        }`}
      >
        {/* Primary nav */}
        <nav className="pt-2">
          <NavItem icon={<HomeIcon />} label="Home" />
          <NavItem
            icon={<LibraryIcon />}
            label="Library"
            active={libraryView === "all"}
            onClick={() => setLibraryView("all")}
          />
          <NavItem
            icon={<SaleTagIcon />}
            label="Sims Publisher Sale"
            sublabel="Sale ends May 7*"
          />
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5">
          {/* Section: All games */}
          <div className="mt-5 px-2">
            <button
              type="button"
              onClick={() => setLibraryView("all")}
              className={`mb-2 flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold hover:bg-[#262838] ${
                libraryView === "all" ? "bg-[#262838] text-white" : "text-white"
              }`}
            >
              <span>All games</span>
              <span className="flex items-center gap-3">
                <span className="text-xs font-normal text-zinc-500">
                  {games.filter((game) => !game.hidden).length}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setAllGamesExpanded((isExpanded) => !isExpanded);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      setAllGamesExpanded((isExpanded) => !isExpanded);
                    }
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded border border-white/10 text-xs text-zinc-300 hover:bg-white/10"
                >
                  {allGamesExpanded ? "-" : "+"}
                </span>
              </span>
            </button>
          </div>
          <AnimatedSidebarList expanded={allGamesExpanded}>
            <div className="space-y-1 pb-1">
              {games
                .filter((game) => !game.hidden)
                .map((game) => (
                  <SidebarGameItem
                    key={game.id}
                    game={game}
                    onToggleFavorite={() => toggleFavorite(game.id)}
                    onSetHidden={(hidden) => setGameHidden(game.id, hidden)}
                  />
                ))}
            </div>
          </AnimatedSidebarList>

          <div className="mt-4 px-2">
            <button
              type="button"
              onClick={() => setLibraryView("favorites")}
              className={`flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#262838] ${
                libraryView === "favorites" ? "bg-[#262838] text-white" : ""
              }`}
            >
              <span className="text-sm font-semibold text-zinc-100">
                Favorited games
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs font-normal text-zinc-500">
                  {favoriteGames.length}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setFavoritesExpanded((isExpanded) => !isExpanded);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      setFavoritesExpanded((isExpanded) => !isExpanded);
                    }
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded border border-white/10 text-xs text-zinc-300 hover:bg-white/10"
                >
                  {favoritesExpanded ? "-" : "+"}
                </span>
              </span>
            </button>
            <AnimatedSidebarList expanded={favoritesExpanded}>
              <div className="mt-1 space-y-1 pb-1">
                {favoriteGames.map((game) => (
                  <SidebarGameItem
                    key={game.id}
                    game={game}
                    onToggleFavorite={() => toggleFavorite(game.id)}
                    onSetHidden={(hidden) => setGameHidden(game.id, hidden)}
                  />
                ))}
              </div>
            </AnimatedSidebarList>
          </div>

          {hiddenGames.length > 0 ? (
            <div className="mt-4 px-2">
              <button
                type="button"
                onClick={() => {
                  setLibraryView("hidden");
                  setHiddenExpanded(true);
                }}
                className={`flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#262838] ${
                  libraryView === "hidden" ? "bg-[#262838] text-white" : ""
                }`}
              >
                <span className="text-sm font-semibold text-zinc-100">
                  Hidden games ({hiddenGames.length})
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setHiddenExpanded((isExpanded) => !isExpanded);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      setHiddenExpanded((isExpanded) => !isExpanded);
                    }
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded border border-white/10 text-xs text-zinc-300 hover:bg-white/10"
                >
                  {hiddenExpanded ? "-" : "+"}
                </span>
              </button>
              <AnimatedSidebarList expanded={hiddenExpanded}>
                <div className="mt-1 space-y-1 pb-1">
                  {hiddenGames.map((game) => (
                    <SidebarGameItem
                      key={game.id}
                      game={game}
                      muted
                      onToggleFavorite={() => toggleFavorite(game.id)}
                      onSetHidden={(hidden) => setGameHidden(game.id, hidden)}
                    />
                  ))}
                </div>
              </AnimatedSidebarList>
            </div>
          ) : null}
        </div>
      </aside>

      {/* ============== MAIN CONTENT ============== */}
      <main
        className={`flex h-screen min-w-0 flex-1 flex-col bg-[#1e2033] ${
          openCardMenuTitle ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 pt-4">
          <div className="flex items-center gap-2">
            <SquareIconButtonSmall ariaLabel="Back">
              <ChevronLeft />
            </SquareIconButtonSmall>
            <SquareIconButtonSmall ariaLabel="Forward" disabled>
              <ChevronRight />
            </SquareIconButtonSmall>
          </div>
          <div className="flex items-center gap-2">
            <SquareIconButton ariaLabel="Wishlist">
              <Heart className="size-3.5" fill="white" />{" "}
              <span className="text-xs ml-2">1</span>
            </SquareIconButton>
            <SquareIconButton ariaLabel="Cart">
              <ShoppingCart fill="white" className="size-3.5" />
            </SquareIconButton>
            <span className="mx-1 h-5 w-px bg-zinc-700/60" />
            <SquareIconButton ariaLabel="Notifications">
              <Bell className="size-3.5" />
            </SquareIconButton>
          </div>
        </div>

        {/* Page header */}
        <div
          className={`flex items-center justify-between gap-4 px-10 pt-4 transition-[box-shadow,filter] duration-300 ${
            isTourTarget("library")
              ? "relative z-40 rounded-2xl shadow-[0_0_0_2px_rgba(39,106,252,0.9),0_0_60px_rgba(39,106,252,0.35)]"
              : ""
          }`}
        >
          <h1 className="text-[28px] font-bold tracking-tight text-zinc-100">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={startTour}
              className="rounded-lg border-2 border-white/15 px-4 py-1.5 text-xs font-bold tracking-widest text-zinc-200 transition-colors hover:cursor-pointer hover:border-[#276afc] hover:bg-white/5"
            >
              START TOUR
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border-2 border-[#276afc] px-4 py-1.5 text-xs font-bold tracking-widest text-zinc-200 hover:cursor-pointer hover:bg-white/5"
            >
              <PlusIcon />
              REDEEM CODE
            </button>
          </div>
        </div>
        <div className="px-10">
          <div className="mt-3 h-0.5 w-full bg-[#262838]" />
        </div>

        {/* Game library */}
        <div className="px-10 pt-4">
          <div className="mb-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[15px] font-semibold text-zinc-100">
                {libraryView === "hidden"
                  ? "Hidden games"
                  : libraryView === "favorites"
                    ? "Favorited games"
                    : "All games"}{" "}
                <span className="font-normal text-zinc-500">
                  ({sortedGames.length})
                </span>
              </h2>
            </div>
            <div
              className={`flex w-full items-center gap-3 transition-[box-shadow,filter] duration-300 ${
                isTourTarget("filters")
                  ? "relative z-40 rounded-2xl shadow-[0_0_0_2px_rgba(39,106,252,0.9),0_0_60px_rgba(39,106,252,0.35)]"
                  : ""
              }`}
            >
              <label className="relative flex-1">
                <span className="sr-only">Search games</span>
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                  <SearchIcon />
                </span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search games"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#2a2d3f] pl-11 pr-4 text-[14px] font-semibold text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-[#276afc] focus:bg-[#343b49]"
                />
              </label>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((isOpen) => !isOpen)}
                  className={`flex h-11 min-w-[150px] items-center justify-between rounded-xl border px-3 text-left text-[12px] font-semibold transition-colors ${
                    sortMenuOpen
                      ? "border-[#276afc] bg-[#343b49] text-white"
                      : "border-white/10 bg-[#2a2d3f] text-zinc-100 hover:border-white/20 hover:bg-[#343b49]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{sortOption}</span>
                  </span>
                  <span
                    className={`ml-3 text-lg text-zinc-400 transition-transform ${
                      sortMenuOpen ? "-rotate-90" : "rotate-90"
                    }`}
                  >
                    ›
                  </span>
                </button>
                {sortMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#343b49] p-2 text-[14px] font-semibold text-zinc-100">
                    <div className="space-y-2">
                      {sortOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSortOption(option);
                            setSortMenuOpen(false);
                          }}
                          className={`block w-full rounded-xl px-4 py-3 text-left transition-colors hover:bg-[#dfe3e7] hover:text-[#343b49] ${
                            sortOption === option
                              ? "bg-[#dfe3e7] text-[#343b49]"
                              : ""
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div
            className={`grid grid-cols-[repeat(auto-fill,minmax(220px,240px))] justify-start gap-6 pb-10 transition-[box-shadow,filter] duration-300 ${
              isTourTarget("cards") ||
              isTourTarget("card-menu") ||
              isTourTarget("toast")
                ? "relative z-40 rounded-3xl shadow-[0_0_0_2px_rgba(39,106,252,0.9),0_0_70px_rgba(39,106,252,0.32)]"
                : ""
            }`}
          >
            {sortedGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onToggleFavorite={() => toggleFavorite(game.id)}
                onSetHidden={(hidden) => setGameHidden(game.id, hidden)}
              />
            ))}
          </div>
        </div>

        <div className="min-h-8" />
      </main>

      {/* ============== RIGHT SIDEBAR ============== */}
      <aside className="flex h-screen w-1/20 shrink-0 flex-col items-center bg-[#171b2a]">
        <button
          type="button"
          aria-label="Profile"
          className="relative mt-6 flex h-[50px] w-[50px] items-center justify-center rounded-2xl hover:bg-white/5"
        >
          <RightRailAvatar />
          <span className="absolute right-[2px] bottom-[2px] flex h-[12px] w-[12px] items-center justify-center rounded-full bg-[#00dc72] ring-[3px] ring-[#171b2a]">
            <svg viewBox="0 0 16 16" className="h-[8px] w-[8px]" fill="none">
              <path
                d="M4 8.2 6.7 11 12.2 5"
                stroke="#172137"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>

        <div className="flex-1" />

        <div className="mb-9 flex w-[52px] flex-col items-center gap-7 rounded-2xl bg-[#141827] py-6 text-[#999ba8]">
          <button
            type="button"
            aria-label="Link friends"
            className="text-white hover:text-zinc-200"
          >
            <RailPngIcon src={linkIconImage} alt="Link friends" />
          </button>
          <button
            type="button"
            aria-label="PlayStation"
            className="hover:text-zinc-200"
          >
            <RailPngIcon src={psIconImage} alt="PlayStation" />
          </button>
          <button
            type="button"
            aria-label="Steam"
            className="hover:text-zinc-200"
          >
            <RailPngIcon src={steamIconImage} alt="Steam" />
          </button>
          <button
            type="button"
            aria-label="Xbox"
            className="hover:text-zinc-200"
          >
            <RailPngIcon src={xboxIconImage} alt="Xbox" />
          </button>
        </div>

        <button
          type="button"
          aria-label="Collapse panel"
          className="mb-7 flex hover:cursor-pointer h-[35px] w-[35px] items-center justify-center rounded-lg border-2 border-[#6c7080] text-white hover:bg-white/5"
        >
          <ArrowRightFromLine className="size-4" />
        </button>
      </aside>
      {toast ? (
        <ActionToast
          toast={toast}
          visible={toastVisible}
          onDismiss={dismissToast}
        />
      ) : null}
      {activeTourStep ? (
        <TourOverlay
          step={activeTourStep}
          stepIndex={tourStepIndex}
          totalSteps={tourSteps.length}
          showSkip={showSkipTour}
          onClose={closeTour}
          onSkip={closeTour}
          onPrevious={goToPreviousTourStep}
          onNext={goToNextTourStep}
        />
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- */
/*                   Reusable sub-components                   */
/* ----------------------------------------------------------- */

function NavItem({
  icon,
  label,
  sublabel,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full hover:cursor-pointer items-center gap-3 px-5 py-5 text-left ${
        active
          ? "bg-[#343647] text-white border-l-4 border-white"
          : "text-zinc-300 hover:bg-[#262838]"
      }`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-zinc-200">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{label}</span>
        {sublabel ? (
          <span className="block truncate  text-[11px] text-zinc-500">
            {sublabel}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function SidebarGameItem({
  game,
  muted,
  onToggleFavorite,
  onSetHidden,
}: {
  game: Game;
  muted?: boolean;
  onToggleFavorite: () => void;
  onSetHidden: (hidden: boolean) => void;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    left: VIEWPORT_GUTTER,
    top: VIEWPORT_GUTTER,
  });
  const [opensToRight, setOpensToRight] = useState(true);
  const [submenuOpensRight, setSubmenuOpensRight] = useState(true);

  const openMenu = (
    event: MouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const itemRect =
      itemRef.current?.getBoundingClientRect() ??
      event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rightSideLeft = itemRect.right + CARD_MENU_GAP;
    const canOpenRight =
      rightSideLeft + CARD_MENU_WIDTH <= viewportWidth - VIEWPORT_GUTTER;
    const left = canOpenRight
      ? rightSideLeft
      : Math.max(
          VIEWPORT_GUTTER,
          itemRect.left - CARD_MENU_WIDTH - CARD_MENU_GAP,
        );

    setOpensToRight(canOpenRight);
    setSubmenuOpensRight(
      left + CARD_MENU_WIDTH + CARD_MENU_GAP + MANAGE_MENU_WIDTH <=
        viewportWidth - VIEWPORT_GUTTER,
    );
    setMenuPosition({
      left,
      top: Math.min(
        Math.max(itemRect.top, VIEWPORT_GUTTER),
        Math.max(VIEWPORT_GUTTER, viewportHeight - 300),
      ),
    });
    window.dispatchEvent(
      new CustomEvent("ea-card-menu-open", { detail: game.title }),
    );
    window.dispatchEvent(
      new CustomEvent("ea-card-menu-state", {
        detail: { title: game.title, isOpen: true },
      }),
    );
    setMenuMounted(true);
    window.requestAnimationFrame(() => setMenuOpen(true));
  };

  const closeMenu = () => {
    window.dispatchEvent(
      new CustomEvent("ea-card-menu-state", {
        detail: { title: game.title, isOpen: false },
      }),
    );
    setMenuOpen(false);
    window.setTimeout(() => setMenuMounted(false), 180);
  };

  useEffect(() => {
    if (!menuMounted) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!itemRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const handleOtherMenu = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== game.title) closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("ea-card-menu-open", handleOtherMenu);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("ea-card-menu-open", handleOtherMenu);
    };
  }, [menuMounted, game.title]);

  return (
    <div ref={itemRef} className="relative">
      <button
        type="button"
        onPointerDown={(event) => {
          if (event.ctrlKey || event.button === 2) openMenu(event);
        }}
        onContextMenu={openMenu}
        onClick={(event) => {
          if (event.ctrlKey) openMenu(event);
        }}
        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#262838]"
      >
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
          <Image
            src={game.cover}
            alt={game.title}
            fill
            sizes="32px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-[13px] ${
              muted ? "text-zinc-400" : "text-zinc-200"
            }`}
          >
            {game.title}
          </div>
          <div className="truncate text-[11px] text-zinc-500">
            {game.favorite
              ? "Favorite"
              : game.needsInstall
                ? "Download"
                : "Ready"}
          </div>
        </div>
      </button>

      {menuMounted
        ? createPortal(
            <GameContextMenu
              isOpen={menuOpen}
              needsInstall={game.needsInstall}
              isFavorite={game.favorite}
              isHidden={game.hidden}
              opensToRight={opensToRight}
              submenuOpensRight={submenuOpensRight}
              position={menuPosition}
              onToggleFavorite={onToggleFavorite}
              onSetHidden={onSetHidden}
              onClose={closeMenu}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function AnimatedSidebarList({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${
        expanded
          ? "grid-rows-[1fr] translate-y-0 opacity-100"
          : "grid-rows-[0fr] -translate-y-1 opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function ActionToast({
  toast,
  visible,
  onDismiss,
}: {
  toast: ToastMessage;
  visible: boolean;
  onDismiss: () => void;
}) {
  const handleUndo = () => {
    toast.onUndo();
    onDismiss();
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-80 w-[min(520px,calc(100vw-48px))] -translate-x-1/2 transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      }`}
    >
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#343b49]/95 px-4 py-3 text-zinc-100 backdrop-blur">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#276afc] text-white">
          <CheckIcon />
        </div>
        <p className="min-w-0 flex-1 text-[14px] font-semibold">
          {toast.message}
        </p>
        <button
          type="button"
          onClick={handleUndo}
          className="rounded-lg border border-[#276afc] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#276afc]"
        >
          {toast.undoLabel}
        </button>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  showSkip,
  onClose,
  onSkip,
  onPrevious,
  onNext,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  showSkip: boolean;
  onClose: () => void;
  onSkip: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const isLastStep = stepIndex === totalSteps - 1;
  const panelPosition = tourPanelPositions[step.target];
  const spotlight = tourSpotlights[step.target];

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-90">
      <TourSpotlight spotlight={spotlight} />
      <div
        className="pointer-events-auto fixed w-[min(440px,calc(100vw-56px))] animate-[tourFloatIn_360ms_cubic-bezier(.2,.8,.2,1)] transition-[top,left,transform] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={panelPosition}
      >
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#252a3a]/95 text-zinc-100 shadow-[0_32px_90px_rgba(0,0,0,0.58)] backdrop-blur-xl">
          <div className="relative h-1.5 bg-[#151a29]">
            <div
              className="absolute inset-y-0 left-0 rounded-r-full bg-[#276afc] transition-[width] duration-500 ease-out"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <div className="p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7da6ff]">
                  {step.eyebrow}
                </p>
                <h2 className="mt-2 text-[24px] font-black leading-tight tracking-tight text-white">
                  {step.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close tour"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <p className="text-[14px] font-medium leading-6 text-zinc-300">
              {step.body}
            </p>

            <div className="mt-5 rounded-2xl border border-[#276afc]/30 bg-[#1c2440] px-4 py-3 text-[13px] font-semibold leading-5 text-[#cddcff]">
              {step.hint}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === stepIndex
                        ? "w-7 bg-[#276afc]"
                        : "w-1.5 bg-white/20"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {showSkip ? (
                  <button
                    type="button"
                    onClick={onSkip}
                    className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Skip
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onPrevious}
                  disabled={stepIndex === 0}
                  className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-lg bg-[#276afc] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition-transform hover:-translate-y-0.5 hover:bg-[#3f7fff]"
                >
                  {isLastStep ? "Finish" : "Next"}
                </button>
              </div>
            </div>

            <p className="mt-4 text-[11px] font-semibold text-zinc-500">
              Tip: use ← / → to move through the tour, or Esc to close.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TourSpotlight({
  spotlight,
}: {
  spotlight: {
    left: string;
    top: string;
    width: string;
    height: string;
    radius: string;
  };
}) {
  const sharedPanelClass =
    "fixed bg-[rgba(8,11,21,0.48)] backdrop-blur-[2px] transition-[top,left,right,bottom,width,height] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]";

  return (
    <>
      <div
        className={sharedPanelClass}
        style={{ left: 0, top: 0, right: 0, height: spotlight.top }}
      />
      <div
        className={sharedPanelClass}
        style={{
          left: 0,
          top: `calc(${spotlight.top} + ${spotlight.height})`,
          right: 0,
          bottom: 0,
        }}
      />
      <div
        className={sharedPanelClass}
        style={{
          left: 0,
          top: spotlight.top,
          width: spotlight.left,
          height: spotlight.height,
        }}
      />
      <div
        className={sharedPanelClass}
        style={{
          left: `calc(${spotlight.left} + ${spotlight.width})`,
          top: spotlight.top,
          right: 0,
          height: spotlight.height,
        }}
      />
      <div
        className="fixed border-2 border-[#276afc] shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_70px_rgba(39,106,252,0.38)] transition-[top,left,width,height,border-radius] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{
          left: spotlight.left,
          top: spotlight.top,
          width: spotlight.width,
          height: spotlight.height,
          borderRadius: spotlight.radius,
        }}
      />
    </>
  );
}

function SquareIconButton({
  children,
  ariaLabel,
  disabled,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={`relative flex h-8 w-max px-4 items-center justify-center rounded-lg border-2 border-[#62626f] text-zinc-300 ${
        disabled
          ? "opacity-40"
          : "hover:border-zinc-500 hover:cursor-pointer hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function SquareIconButtonSmall({
  children,
  ariaLabel,
  disabled,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={`relative flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#62626f] text-zinc-300 ${
        disabled
          ? "opacity-40"
          : "hover:border-zinc-500 hover:cursor-pointer hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function RailPngIcon({ src, alt }: { src: StaticImageData; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={32}
      height={32}
      className="h-8 w-8 object-contain"
    />
  );
}

function ImportItem({
  icon,
  name,
  sub,
}: {
  icon: React.ReactNode;
  name: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-md px-1 py-1 text-left hover:bg-[#1f2229]"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-zinc-300">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium text-zinc-200">
          {name}
        </span>
        <span className="block truncate text-[10.5px] text-zinc-500">
          {sub}
        </span>
      </span>
    </button>
  );
}

function GameCard({
  game,
  onToggleFavorite,
  onSetHidden,
}: {
  game: Game;
  onToggleFavorite: () => void;
  onSetHidden: (hidden: boolean) => void;
}) {
  const {
    title,
    subtitle,
    cover,
    hoursPlayed,
    lastPlayed,
    needsInstall,
    favorite,
    hidden,
  } = game;
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    left: VIEWPORT_GUTTER,
    top: VIEWPORT_GUTTER,
  });
  const [opensToRight, setOpensToRight] = useState(true);
  const [submenuOpensRight, setSubmenuOpensRight] = useState(true);

  const openMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const cardRect =
      menuRef.current?.getBoundingClientRect() ??
      event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rightSideLeft = cardRect.right + CARD_MENU_GAP;
    const canOpenRight =
      rightSideLeft + CARD_MENU_WIDTH <= viewportWidth - VIEWPORT_GUTTER;
    const left = canOpenRight
      ? rightSideLeft
      : Math.max(
          VIEWPORT_GUTTER,
          cardRect.left - CARD_MENU_WIDTH - CARD_MENU_GAP,
        );

    setOpensToRight(canOpenRight);
    setSubmenuOpensRight(
      left + CARD_MENU_WIDTH + CARD_MENU_GAP + MANAGE_MENU_WIDTH <=
        viewportWidth - VIEWPORT_GUTTER,
    );
    setMenuPosition({
      left,
      top: Math.min(
        Math.max(cardRect.top + 16, VIEWPORT_GUTTER),
        Math.max(VIEWPORT_GUTTER, viewportHeight - 300),
      ),
    });
    window.dispatchEvent(
      new CustomEvent("ea-card-menu-open", { detail: title }),
    );
    window.dispatchEvent(
      new CustomEvent("ea-card-menu-state", {
        detail: { title, isOpen: true },
      }),
    );
    setMenuMounted(true);
    window.requestAnimationFrame(() => setMenuOpen(true));
  };

  const closeMenu = () => {
    window.dispatchEvent(
      new CustomEvent("ea-card-menu-state", {
        detail: { title, isOpen: false },
      }),
    );
    setMenuOpen(false);
    window.setTimeout(() => setMenuMounted(false), 180);
  };

  useEffect(() => {
    if (!menuMounted) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      const isInsideMenu =
        target instanceof Element &&
        target.closest('[data-game-context-menu="true"]');

      if (!menuRef.current?.contains(target as Node) && !isInsideMenu) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const handleOtherMenu = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== title) closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("ea-card-menu-open", handleOtherMenu);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("ea-card-menu-open", handleOtherMenu);
    };
  }, [menuMounted, title]);

  return (
    <div ref={menuRef} className="relative">
      <article
        onContextMenu={openMenu}
        onClick={(event) => {
          if (event.ctrlKey) openMenu(event);
        }}
        className="group flex flex-col overflow-hidden rounded-[26px] bg-[#2a2d3f] hover:cursor-pointer transition-transform duration-200 hover:-translate-y-1"
      >
        <div className="relative aspect-3/4 w-full overflow-hidden">
          <Image
            src={cover}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover"
          />
          {favorite ? (
            <div className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-md border-2 border-white/25 bg-[#2a2d3f] text-white backdrop-blur-sm">
              <Heart className="size-3.5" fill="white" />
            </div>
          ) : null}
          {needsInstall ? (
            <button
              type="button"
              aria-label="Download"
              className="absolute hover:cursor-pointer right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm hover:bg-black/80"
            >
              <DownloadIcon />
            </button>
          ) : null}
          {/* More menu (top-right, on hover) */}
          <button
            type="button"
            aria-label="More options"
            onClick={openMenu}
            className={`absolute hover:cursor-pointer top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 ${
              needsInstall ? "right-10" : "right-2"
            }`}
          >
            <DotsIcon />
          </button>
        </div>
        <div className="flex flex-1 flex-col px-5 py-5 transition-colors duration-200 group-hover:bg-[#242739]">
          <div>
            <div>
              <h3 className="text-[21px] font-bold leading-tight tracking-tight text-white">
                {title}
              </h3>
              {/* <p className="mt-1 text-[14px] text-zinc-300">{subtitle}</p> */}
            </div>
          </div>

          <div className="mt-auto pt-2 text-[12px] font-medium leading-relaxed text-zinc-500">
            <span className="text-white/70">{hoursPlayed}</span>
            <span className="mx-2 text-zinc-600">•</span>
            <span>{lastPlayed}</span>
          </div>
        </div>
      </article>

      {menuMounted
        ? createPortal(
            <GameContextMenu
              isOpen={menuOpen}
              needsInstall={needsInstall}
              isFavorite={favorite}
              isHidden={hidden}
              opensToRight={opensToRight}
              submenuOpensRight={submenuOpensRight}
              position={menuPosition}
              onToggleFavorite={onToggleFavorite}
              onSetHidden={onSetHidden}
              onClose={closeMenu}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function GameContextMenu({
  isOpen,
  needsInstall,
  isFavorite,
  isHidden,
  opensToRight,
  submenuOpensRight,
  position,
  onToggleFavorite,
  onSetHidden,
  onClose,
}: {
  isOpen: boolean;
  needsInstall: boolean;
  isFavorite: boolean;
  isHidden: boolean;
  opensToRight: boolean;
  submenuOpensRight: boolean;
  position: { left: number; top: number };
  onToggleFavorite: () => void;
  onSetHidden: (hidden: boolean) => void;
  onClose: () => void;
}) {
  const menuClosedTranslate = opensToRight ? "-translate-x-2" : "translate-x-2";
  const submenuSideClass = submenuOpensRight
    ? "left-full translate-x-1"
    : "right-full -translate-x-1";

  return (
    <div
      data-game-context-menu="true"
      style={{ left: position.left, top: position.top }}
      className={`fixed z-50 w-[236px] flex gap-1 flex-col rounded-2xl border border-white/10 bg-[#343b49] p-2 text-[15px] font-semibold text-zinc-100 transition-all duration-200 ease-out ${
        isOpen
          ? "translate-x-0 scale-100 opacity-100"
          : `${menuClosedTranslate} scale-95 opacity-0`
      }`}
    >
      {needsInstall ? (
        <ContextMenuButton
          onClick={onClose}
          className="bg-[#1976f3] text-white"
        >
          <span className="flex items-center gap-3">
            <DownloadIcon />
            Install
          </span>
        </ContextMenuButton>
      ) : null}
      <ContextMenuButton
        onClick={() => {
          onToggleFavorite();
          onClose();
        }}
      >
        {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
      </ContextMenuButton>
      {/* <ContextMenuButton>
        <span>Add to</span>
        <MenuChevron />
      </ContextMenuButton> */}
      <div className="group/manage relative">
        <ContextMenuButton className="bg-white/10 group-hover/manage:bg-[#dfe3e7] group-hover/manage:text-[#343b49]">
          <span>Manage</span>
          <MenuChevron />
        </ContextMenuButton>
        <div
          className={`pointer-events-none flex gap-1 flex-col absolute top-0 w-[260px] rounded-2xl border border-white/10 bg-[#3b4350] p-2 opacity-0 transition-all duration-200 ease-out group-hover/manage:pointer-events-auto group-hover/manage:translate-x-0 group-hover/manage:opacity-100 group-focus-within/manage:pointer-events-auto group-focus-within/manage:translate-x-0 group-focus-within/manage:opacity-100 ${submenuSideClass}`}
        >
          {/* <ContextMenuButton onClick={onClose}>
            Set custom artwork
          </ContextMenuButton> */}
          <ContextMenuButton
            onClick={() => {
              onSetHidden(!isHidden);
              onClose();
            }}
          >
            {isHidden ? "Unhide this game" : "Hide this game"}
          </ContextMenuButton>
          {/* <ContextMenuButton onClick={onClose}>
            Mark as Private
          </ContextMenuButton> */}
          <ContextMenuButton onClick={onClose}>
            Remove from account
          </ContextMenuButton>
        </div>
      </div>
      <ContextMenuButton onClick={onClose}>Properties...</ContextMenuButton>
    </div>
  );
}

function ContextMenuButton({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center justify-between rounded-xl px-4 text-left transition-colors hover:bg-[#dfe3e7] hover:text-[#343b49] ${className}`}
    >
      {children}
    </button>
  );
}

function MenuChevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="m5 12 4 4 10-10"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ----------------------------------------------------------- */
/*                      Decorative SVGs                        */
/* ----------------------------------------------------------- */

function SimsCover() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src={simsCover}
        alt="The Sims 4"
        fill
        sizes="(max-width: 768px) 32px, 160px"
        className="object-cover"
      />
    </div>
  );
}

function SimSilhouette({ variant }: { variant: number }) {
  const colors = [
    { skin: "#f0c39a", hair: "#3a2418", shirt: "#e74c3c" },
    { skin: "#d4a373", hair: "#1a1a1a", shirt: "#f5d547" },
    { skin: "#c89678", hair: "#5b3924", shirt: "#3498db" },
    { skin: "#e8b88a", hair: "#7a4a2a", shirt: "#9b59b6" },
    { skin: "#cf9a72", hair: "#2c1810", shirt: "#2ecc71" },
  ];
  const c = colors[variant % colors.length];
  return (
    <svg viewBox="0 0 20 36" className="h-[58%] w-auto">
      {/* head */}
      <circle cx="10" cy="6" r="5" fill={c.skin} />
      {/* hair */}
      <path d="M5 5 Q10 -1 15 5 L15 7 Q10 3 5 7 Z" fill={c.hair} />
      {/* body */}
      <rect x="3" y="11" width="14" height="14" rx="2" fill={c.shirt} />
      {/* legs */}
      <rect x="4" y="24" width="5" height="11" fill="#2b3445" />
      <rect x="11" y="24" width="5" height="11" fill="#2b3445" />
    </svg>
  );
}

function SimsThumb({
  size = 32,
  rounded = "rounded",
}: {
  size?: number;
  rounded?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden ${rounded}`}
      style={{ width: size, height: size }}
    >
      <SimsCover />
    </div>
  );
}

function PandaAvatar({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <circle cx="16" cy="17" r="11" fill="#f5f5f5" />
      <circle cx="9" cy="9" r="4.5" fill="#1a1a1a" />
      <circle cx="23" cy="9" r="4.5" fill="#1a1a1a" />
      <ellipse cx="11.5" cy="17" rx="2.5" ry="3" fill="#1a1a1a" />
      <ellipse cx="20.5" cy="17" rx="2.5" ry="3" fill="#1a1a1a" />
      <circle cx="11.5" cy="17.5" r="0.9" fill="#fff" />
      <circle cx="20.5" cy="17.5" r="0.9" fill="#fff" />
      <ellipse cx="16" cy="22" rx="1.6" ry="1.1" fill="#1a1a1a" />
    </svg>
  );
}

function RightRailAvatar() {
  return (
    <svg viewBox="0 0 58 58" className="h-[58px] w-[58px]" aria-hidden>
      <rect x="4" y="4" width="50" height="50" rx="15" fill="#696b7a" />
      <circle cx="21" cy="28" r="4" fill="#f4f4f6" />
      <circle cx="39" cy="28" r="4" fill="#f4f4f6" />
      <path
        d="M24 39h10"
        stroke="#f4f4f6"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FriendsIllustration() {
  return (
    <svg
      viewBox="0 0 120 90"
      className="h-[88px] w-auto opacity-70"
      aria-hidden
    >
      <g fill="#5b6470">
        {/* Back person */}
        <circle cx="60" cy="28" r="11" />
        <path d="M40 78 Q60 52 80 78 Z" />
        {/* Left person */}
        <circle cx="30" cy="38" r="9" />
        <path d="M14 82 Q30 60 46 82 Z" />
        {/* Right person */}
        <circle cx="90" cy="38" r="9" />
        <path d="M74 82 Q90 60 106 82 Z" />
      </g>
    </svg>
  );
}

/* ----------------------------- icons ---------------------------- */

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-[40px] w-[40px] scale-125"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="17" y="13" width="30" height="38" rx="2.5" />
      <path d="M8 20v24" />
      <path d="M56 20v24" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-[40px] w-[40px] scale-125"
      fill="none"
      aria-hidden
    >
      <path
        d="M22 9h20"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M16 20h32"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="12" y="28" width="40" height="32" rx="8" fill="currentColor" />
      <path d="M27 37v14l13-7-13-7z" fill="#343647" />
    </svg>
  );
}

function SaleTagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
      <path
        d="M3 13V4h9l9 9-9 9-9-9z"
        fill="#e74c3c"
        stroke="#e74c3c"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="8.5" r="1.4" fill="#171b2a" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 6 9 12 15 18" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6.5 5.5 5.5 0 0 1 21.5 12c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 4h2l2.5 12h11l2-8H6" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v12" />
      <polyline points="7 11 12 16 17 11" />
      <path d="M5 20h14" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.4 11.4H10a5 5 0 0 0 0 10h4.1" />
      <path d="M18.6 20.6H22a5 5 0 0 0 0-10h-4.1" />
      <path d="M12.5 16h7" />
    </svg>
  );
}
function PlayStationIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor">
      <path d="M12.3 4.8v20.4l4.1-1.3V9.1c0-1.1.5-1.7 1.4-1.4.9.2 1.2 1 1.2 2.1v6c3.9-1.9 5.6-4.1 5.3-7.1-.4-4-4-5.5-12-3.9Z" />
      <path d="M8.9 20.7 5.6 22c-3.5 1.3-3.9 3.2-.9 4.3 2.3.8 5.8.6 8.5-.4l3.2-1.1v-3.4l-3.5 1.2c-1.4.5-3 .6-4 .3-1-.3-.8-.9.4-1.4l3.6-1.3v-3.4l-4 1.5Z" />
      <path d="M19.2 20.4v3.2l6.9-2.4c3.1-1.1 4.1-2.6 2.1-3.8-1.8-1.1-5.1-1.1-8-.1l-1 .4v3.3l2.5-.9c1.2-.4 2.6-.5 3.4-.2.7.3.6.8-.5 1.2l-5.4 1.9Z" />
    </svg>
  );
}

function SteamIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor">
      <path d="M16 2.8C9.1 2.8 3.5 8 2.9 14.7l7.1 3a4.2 4.2 0 0 1 2.5-.8l3.4-4.9v-.1a5.1 5.1 0 1 1 5.1 5.1h-.1L16 20.6c0 .1 0 .2.1.4a4.4 4.4 0 0 1-8.7.8l-4.6-2A13.2 13.2 0 1 0 16 2.8Zm0 16.1-2.1-.9a3.2 3.2 0 0 0-2.7-.2l2.4 1a2.3 2.3 0 1 1-1.8 4.2l-2.3-1a3.2 3.2 0 1 0 6.5-3.1Zm5-9.7a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Zm0 1.3a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z" />
    </svg>
  );
}

function XboxIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor">
      <path d="M16 2.8c-3.5 0-6.6 1.3-9 3.4 2.2-.3 5.3 1.4 9 4.7 3.7-3.3 6.8-5 9-4.7a13.1 13.1 0 0 0-9-3.4Z" />
      <path d="M5.4 7.9A13.1 13.1 0 0 0 2.8 16c0 3.1 1.1 6 3 8.2 1.5-3.8 4.6-8.2 8.4-11.6-3.3-2.9-6.8-5.1-8.8-4.7Z" />
      <path d="M26.6 7.9c-2-.4-5.5 1.8-8.8 4.7 3.8 3.4 6.9 7.8 8.4 11.6a13.1 13.1 0 0 0 .4-16.3Z" />
      <path d="M16 15.1C11.9 18.9 9 23.4 8.5 26.8a13.2 13.2 0 0 0 15 0c-.5-3.4-3.4-7.9-7.5-11.7Z" />
    </svg>
  );
}
