import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchplaylistsByID,
  searchAlbumByQuery,
  searchPlayListByQuery,
} from "../../fetch";

import AlbumSlider from "./Sliders/AlbumSlider";
import PlaylistSlider from "./Sliders/PlaylistSlider";
import ArtistSlider from "./Sliders/ArtistSlider";
import SongGrid from "./SongGrid";
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { artistData } from "../genreData";
import { useLanguages } from "../hooks/useLanguages";

// ============================================================
// CACHE CONFIG
// ============================================================
const CACHE_TIME = 5 * 60 * 1000;
const CACHE_KEYS = {
  trending: "musicmax_main_trending",
  latest: "musicmax_main_latest",
  albums: "musicmax_main_albums",
  playlists: "musicmax_main_playlists",
};

const readCache = (key) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.data)) return null;
    if (Date.now() - Number(parsed.timestamp || 0) > CACHE_TIME) return null;
    return parsed.data;
  } catch (error) {
    console.warn(`Cache read failed: ${key}`, error);
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    if (!Array.isArray(data)) return;
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch (error) {
    console.warn(`Cache write failed: ${key}`, error);
  }
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const getResponseList = (response, keys = []) => {
  const candidates = [response?.data, response?.data?.data, response?.data?.results, response?.results, response];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    for (const key of keys) {
      if (Array.isArray(candidate?.[key])) return candidate[key];
    }
  }
  return [];
};

const normalizeLanguageOptions = (response) => {
  const raw = getResponseList(response, ["languages", "list", "results"]);
  const options = raw
    .map((item) => {
      if (typeof item === "string") return { label: item, value: item.toLowerCase() };
      const label = item?.name ?? item?.label ?? item?.title ?? item?.language;
      const value = item?.value ?? item?.code ?? item?.id ?? label;
      if (!label || !value) return null;
      return { label: String(label), value: String(value).toLowerCase() };
    })
    .filter(Boolean);
  return options.length ? options : [
    { label: "Hindi", value: "hindi" },
    { label: "English", value: "english" },
    { label: "Tamil", value: "tamil" },
    { label: "Malayalam", value: "malayalam" },
    { label: "Telugu", value: "telugu" },
    { label: "Punjabi", value: "punjabi" },
    { label: "Kannada", value: "kannada" },
    { label: "Bengali", value: "bengali" },
    { label: "Marathi", value: "marathi" },
    { label: "Gujarati", value: "gujarati" },
    { label: "Bhojpuri", value: "bhojpuri" },
  ];
};

const MainSection = () => {
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    try {
      return localStorage.getItem("musicmax_home_language") || "hindi";
    } catch {
      return "hindi";
    }
  });

  const { data: languagesResponse, isLoading: languagesLoading, error: languagesError } = useLanguages();
  const languageOptions = useMemo(() => normalizeLanguageOptions(languagesResponse), [languagesResponse]);

  const [trending, setTrending] = useState(() => readCache(CACHE_KEYS.trending) || []);
  const [latestSongs, setLatestSongs] = useState(() => readCache(CACHE_KEYS.latest) || []);
  const [albums, setAlbums] = useState(() => readCache(CACHE_KEYS.albums) || []);
  const [artists] = useState(() => {
    if (Array.isArray(artistData?.results)) return artistData.results;
    if (Array.isArray(artistData)) return artistData;
    return [];
  });
  const [playlists, setPlaylists] = useState(() => readCache(CACHE_KEYS.playlists) || []);
  const [recentlyPlayedSongs, setRecentlyPlayedSongs] = useState([]);

  const [trendingLoading, setTrendingLoading] = useState(() => (readCache(CACHE_KEYS.trending) || []).length === 0);
  const [latestLoading, setLatestLoading] = useState(() => (readCache(CACHE_KEYS.latest) || []).length === 0);
  const [albumsLoading, setAlbumsLoading] = useState(() => (readCache(CACHE_KEYS.albums) || []).length === 0);
  const [playlistsLoading, setPlaylistsLoading] = useState(() => (readCache(CACHE_KEYS.playlists) || []).length === 0);
  const [error, setError] = useState("");

  const recentlyPlayedScrollRef = useRef(null);
  const latestSongsScrollRef = useRef(null);
  const trendingScrollRef = useRef(null);

  const loadRecentlyPlayed = useCallback(() => {
    try {
      const storedSongs = localStorage.getItem("playedSongs");
      const parsedSongs = storedSongs ? JSON.parse(storedSongs) : [];
      setRecentlyPlayedSongs(Array.isArray(parsedSongs) ? parsedSongs : []);
    } catch (err) {
      console.error("Unable to read recently played songs:", err);
      setRecentlyPlayedSongs([]);
    }
  }, []);

  useEffect(() => {
    loadRecentlyPlayed();
    const handleStorage = () => loadRecentlyPlayed();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("playedSongsUpdated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("playedSongsUpdated", handleStorage);
    };
  }, [loadRecentlyPlayed]);

  const scrollLeft = useCallback((ref) => {
    ref?.current?.scrollBy({ left: -800, behavior: "smooth" });
  }, []);
  const scrollRight = useCallback((ref) => {
    ref?.current?.scrollBy({ left: 800, behavior: "smooth" });
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    if (hour < 21) return "Good Evening";
    return "Good Night";
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetchplaylistsByID(10763385);
        if (!mounted) return;
        const songs = normalizeArray(response?.data?.songs);
        setTrending(songs);
        writeCache(CACHE_KEYS.trending, songs);
      } catch (err) {
        console.error("Trending API Error:", err);
        if (mounted && trending.length === 0) setError((prev) => prev || "Unable to load some music data.");
      } finally {
        if (mounted) setTrendingLoading(false);
      }
    })();
    return () => { mounted = false; };
    // Initial fixed trending playlist is intentionally loaded once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetchplaylistsByID(80802063);
        if (!mounted) return;
        const songs = normalizeArray(response?.data?.songs);
        setLatestSongs(songs);
        writeCache(CACHE_KEYS.latest, songs);
      } catch (err) {
        console.error("Latest Songs API Error:", err);
        if (mounted && latestSongs.length === 0) setError((prev) => prev || "Unable to load some music data.");
      } finally {
        if (mounted) setLatestLoading(false);
      }
    })();
    return () => { mounted = false; };
    // Initial fixed latest playlist is intentionally loaded once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Changing the language reloads language-specific albums and playlists.
  useEffect(() => {
    let mounted = true;
    const cacheKey = `${CACHE_KEYS.albums}_${selectedLanguage}`;
    const cached = readCache(cacheKey);
    setAlbums(cached || []);
    setAlbumsLoading(!cached?.length);
    (async () => {
      try {
        const response = await searchAlbumByQuery(selectedLanguage);
        if (!mounted) return;
        const results = getResponseList(response, ["results", "albums", "list"]);
        setAlbums(results);
        writeCache(cacheKey, results);
        if (selectedLanguage === "hindi") writeCache(CACHE_KEYS.albums, results);
      } catch (err) {
        console.error("Albums API Error:", err);
        if (mounted && !cached?.length) setError((prev) => prev || "Unable to load some music data.");
      } finally {
        if (mounted) setAlbumsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedLanguage]);

  useEffect(() => {
    let mounted = true;
    const cacheKey = `${CACHE_KEYS.playlists}_${selectedLanguage}`;
    const cached = readCache(cacheKey);
    setPlaylists(cached || []);
    setPlaylistsLoading(!cached?.length);
    (async () => {
      try {
        const response = await searchPlayListByQuery(selectedLanguage);
        if (!mounted) return;
        const results = getResponseList(response, ["results", "playlists", "list"]);
        setPlaylists(results);
        writeCache(cacheKey, results);
        if (selectedLanguage === "hindi") writeCache(CACHE_KEYS.playlists, results);
      } catch (err) {
        console.error("Playlists API Error:", err);
        if (mounted && !cached?.length) setError((prev) => prev || "Unable to load some music data.");
      } finally {
        if (mounted) setPlaylistsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedLanguage]);

  const handleLanguageChange = (event) => {
    const value = event.target.value;
    setSelectedLanguage(value);
    setError("");
    try { localStorage.setItem("musicmax_home_language", value); } catch (err) {
      console.warn("Unable to save selected language:", err);
    }
  };

  const SectionLoader = () => (
    <div className="w-full px-4 py-5" aria-label="Loading section">
      <div className="h-28 w-full rounded-xl animate-pulse bg-black/10 dark:bg-white/10" />
    </div>
  );

  return (
    <main className="pt-[3rem] lg:pt-5 my-[2rem] mt-[5rem] lg:my-[4rem] flex flex-col items-center overflow-x-clip gap-[0.3rem] w-full">
      {/* Language option is the first row on the Home page. */}
      <div className="w-full px-4 lg:px-12 mb-3 flex items-center justify-between gap-3 flex-wrap">
        <label htmlFor="home-language" className="text-sm sm:text-base font-semibold">
          Music language
        </label>
        <div className="flex items-center gap-2">
          <select
            id="home-language"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            disabled={languagesLoading && languageOptions.length === 0}
            className="min-w-36 max-w-full rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
            aria-label="Choose music language"
          >
            {!languageOptions.some((item) => item.value === selectedLanguage) && (
              <option value={selectedLanguage}>{selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}</option>
            )}
            {languageOptions.map((language) => (
              <option key={language.value} value={language.value}>{language.label}</option>
            ))}
          </select>
          {languagesLoading && <span className="text-xs opacity-60">Loading…</span>}
        </div>
      </div>
      {languagesError && (
        <p className="w-full px-4 text-xs text-amber-600">Could not load language options from the API. Default languages are shown.</p>
      )}

      <div className="hidden lg:block text-2xl w-full font-semibold lg:ml-[5.5rem] m-1">
        {getGreeting()}
      </div>

      {error && (
        <div className="w-[calc(100%-2rem)] max-w-3xl mx-auto mb-3 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 text-sm text-center" role="status">
          Some music sections could not be loaded. Please try again later.
        </div>
      )}

      {recentlyPlayedSongs.length > 0 && (
        <section className="flex flex-col justify-center items-center w-full">
          <h2 className="m-4 mt-0 text-xl lg:text-2xl font-semibold w-full ml-[3.5rem] lg:ml-[6.5rem]">Recently Played</h2>
          <div className="flex justify-center items-center gap-3 w-full">
            <button type="button" aria-label="Scroll recently played left" onClick={() => scrollLeft(recentlyPlayedScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowLeft /></button>
            <div ref={recentlyPlayedScrollRef} className="grid grid-rows-1 grid-flow-col justify-start overflow-x-auto scroll-hide items-center gap-3 lg:gap-2 w-full px-3 lg:px-0 scroll-smooth">
              {recentlyPlayedSongs.map((song, index) => <SongGrid key={song?.id ?? song?.songId ?? index} {...song} songs={recentlyPlayedSongs} />)}
            </div>
            <button type="button" aria-label="Scroll recently played right" onClick={() => scrollRight(recentlyPlayedScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowRight /></button>
          </div>
        </section>
      )}

      <section className="flex flex-col items-center w-full">
        <h2 className="m-4 text-xl lg:text-2xl font-semibold w-full ml-[3.5rem] lg:ml-[6.5rem]">New Songs</h2>
        {latestLoading && latestSongs.length === 0 ? <SectionLoader /> : latestSongs.length ? (
          <div className="flex justify-center items-center gap-3 w-full">
            <button type="button" aria-label="Scroll new songs left" onClick={() => scrollLeft(latestSongsScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowLeft /></button>
            <div ref={latestSongsScrollRef} className="grid grid-rows-1 lg:grid-rows-2 grid-flow-col justify-start overflow-x-auto scroll-hide items-center gap-3 lg:gap-2 w-full px-3 lg:px-0 scroll-smooth">
              {latestSongs.map((song, index) => <SongGrid key={song?.id ?? song?.songId ?? index} {...song} songs={latestSongs} />)}
            </div>
            <button type="button" aria-label="Scroll new songs right" onClick={() => scrollRight(latestSongsScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowRight /></button>
          </div>
        ) : <p className="px-5 opacity-60">No new songs available.</p>}
      </section>

      <br />
      <section className="flex flex-col justify-center items-center w-full">
        <h2 className="m-4 mt-0 text-xl lg:text-2xl font-semibold w-full ml-[3.5rem] lg:ml-[6.5rem]">Today Trending</h2>
        {trendingLoading && trending.length === 0 ? <SectionLoader /> : trending.length ? (
          <div className="flex justify-center items-center gap-3 w-full">
            <button type="button" aria-label="Scroll trending songs left" onClick={() => scrollLeft(trendingScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowLeft /></button>
            <div ref={trendingScrollRef} className="grid grid-rows-1 sm:grid-rows-2 grid-flow-col justify-start overflow-x-auto scroll-hide items-center gap-3 lg:gap-2 w-full px-3 lg:px-0 scroll-smooth">
              {trending.map((song, index) => <SongGrid key={song?.id ?? song?.songId ?? index} {...song} songs={trending} />)}
            </div>
            <button type="button" aria-label="Scroll trending songs right" onClick={() => scrollRight(trendingScrollRef)} className="text-3xl hover:scale-125 transition-all duration-200 cursor-pointer h-[9rem] arrow-btn hidden lg:flex items-center justify-center"><MdOutlineKeyboardArrowRight /></button>
          </div>
        ) : <p className="px-5 opacity-60">No trending songs available.</p>}
      </section>

      <br />
      <section className="w-full">
        <h2 className="m-4 mt-0 text-xl lg:text-2xl font-semibold w-full ml-[1rem] lg:ml-[3rem]">Top Albums · {languageOptions.find((item) => item.value === selectedLanguage)?.label || selectedLanguage}</h2>
        {albumsLoading && albums.length === 0 ? <SectionLoader /> : albums.length ? <AlbumSlider albums={albums} /> : <p className="px-5 opacity-60">No albums available for this language.</p>}
      </section>

      <br />
      <section className="w-full">
        <h2 className="pr-1 m-4 mt-0 text-xl lg:text-2xl font-semibold w-full ml-[1rem] lg:ml-[3.5rem]">Top Artists</h2>
        {artists.length ? <ArtistSlider artists={artists} /> : <p className="px-5 opacity-60">No artists available.</p>}
      </section>

      <br />
      <section className="w-full flex flex-col gap-3">
        <h2 className="m-1 text-xl lg:text-2xl font-semibold w-full ml-[1rem] lg:ml-[2.8rem]">Top Playlists · {languageOptions.find((item) => item.value === selectedLanguage)?.label || selectedLanguage}</h2>
        {playlistsLoading && playlists.length === 0 ? <SectionLoader /> : playlists.length ? <PlaylistSlider playlists={playlists} /> : <p className="px-5 opacity-60">No playlists available for this language.</p>}
      </section>
    </main>
  );
};

export default MainSection;
