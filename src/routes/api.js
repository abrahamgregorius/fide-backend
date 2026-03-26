const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { getSupabaseClient, getAuthenticatedUser } = require("../lib/supabase");
const { ok, badRequest, unauthorized, notFound } = require("../lib/http");

const router = express.Router();

const LEVEL_LIST = [
	{ level: 1, rank: "Catechumen", min: 0 },
	{ level: 2, rank: "Fidelis", min: 200 },
	{ level: 3, rank: "Discipulis", min: 500 },
	{ level: 4, rank: "Theologus", min: 900 },
	{ level: 5, rank: "Doctor Ecclesiae", min: 1400 },
];

const POINTS_PER_CORRECT_ANSWER = 10;
const POINTS_PER_COMPLETED_LESSON = 50;
const POINTS_PER_BOSS_SUBMISSION = 100;

function getProfileRank(points) {
  let current = LEVEL_LIST[0];

  for (const rank of LEVEL_LIST) {
    if (points >= rank.min) {
      current = rank;
      continue;
    }
    break;
  }

  return current;
}

const endpointList = [
  { method: "GET", path: "/health", authRequired: false, description: "Health check" },
  { method: "GET", path: "/help", authRequired: false, description: "List all endpoints" },
  { method: "GET", path: "/api/docs/", authRequired: false, description: "Swagger UI" },
  { method: "GET", path: "/api/docs-json", authRequired: false, description: "OpenAPI JSON spec" },
  { method: "POST", path: "/auth/signup", authRequired: false, description: "Signup with email and password" },
  { method: "POST", path: "/auth/login", authRequired: false, description: "Login with email and password" },
  { method: "POST", path: "/auth/refresh", authRequired: false, description: "Refresh access token" },
  { method: "GET", path: "/chapters", authRequired: false, description: "List chapters" },
  { method: "GET", path: "/chapters/:chapterSlug", authRequired: false, description: "Get chapter by slug" },
  { method: "GET", path: "/chapters/:chapterSlug/full", authRequired: false, description: "Get chapter with full hierarchy" },
  { method: "GET", path: "/sections/:sectionSlug", authRequired: false, description: "Get section by slug" },
  { method: "GET", path: "/chapters/:chapterSlug/sections", authRequired: false, description: "List sections by chapter" },
  { method: "GET", path: "/lessons/:lessonSlug", authRequired: false, description: "Get lesson by slug" },
  { method: "GET", path: "/sections/:sectionSlug/lessons", authRequired: false, description: "List lessons by section" },
  { method: "GET", path: "/lessons/:lessonSlug/full", authRequired: false, description: "Get lesson with all contents" },
  { method: "GET", path: "/contents/:contentSlug", authRequired: false, description: "Get content by slug" },
  { method: "GET", path: "/lessons/:lessonSlug/contents", authRequired: false, description: "List contents by lesson (supports ?type=material|question)" },
  { method: "POST", path: "/answers", authRequired: true, description: "Submit answer for a question" },
  { method: "GET", path: "/progress", authRequired: true, description: "Get user progress" },
  { method: "GET", path: "/profile", authRequired: true, description: "Get user profile rank and level" },
  { method: "POST", path: "/progress/lesson/:lessonSlug", authRequired: true, description: "Upsert lesson progress" },
  { method: "POST", path: "/progress/content/:contentSlug", authRequired: true, description: "Upsert content progress" },
  { method: "GET", path: "/sections/:sectionSlug/boss", authRequired: false, description: "Get section boss details" },
  { method: "POST", path: "/boss/:bossSlug/submit", authRequired: true, description: "Submit boss answer" },
  { method: "GET", path: "/leaderboard", authRequired: false, description: "Get leaderboard with user rankings" },
  { method: "GET", path: "/streaks", authRequired: true, description: "Get user streak information" },
  { method: "POST", path: "/complete-boss", authRequired: true, description: "Complete a section after boss completion" },
];

function normalizeContentRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    lessonId: row.lesson_id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    content: row.body_html,
    question: row.question_text,
    correctAnswer: row.correct_answer,
    explanationCorrect: row.explanation_correct,
    explanationWrong: row.explanation_wrong,
    sortOrder: row.sort_order,
    choices: row.content_choices || [],
  };
}

router.get(
  "/help",
  asyncHandler(async (req, res) => {
    return ok(res, {
      total: endpointList.length,
      endpoints: endpointList,
    });
  })
);

router.get(
  "/chapters",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);

    const { data, error } = await supabase
      .from("chapters")
      .select("id, level, slug, title, description, image_url, sort_order")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return ok(res, data);
  })
);

router.get(
  "/chapters/:chapterSlug",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { chapterSlug } = req.params;

    const { data, error } = await supabase
      .from("chapters")
      .select("id, level, slug, title, description, image_url, sort_order")
      .eq("slug", chapterSlug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return notFound(res, "Chapter not found");

    return ok(res, data);
  })
);

router.get(
  "/chapters/:chapterSlug/full",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { chapterSlug } = req.params;

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id, level, slug, title, description, image_url, sort_order")
      .eq("slug", chapterSlug)
      .maybeSingle();

    if (chapterError) throw chapterError;
    if (!chapter) return notFound(res, "Chapter not found");

    const { data: sections, error: sectionsError } = await supabase
      .from("sections")
      .select("id, chapter_id, level, slug, title, is_final_boss, sort_order")
      .eq("chapter_id", chapter.id)
      .order("sort_order", { ascending: true });

    if (sectionsError) throw sectionsError;

    const sectionIds = sections.map((s) => s.id);

    let lessons = [];
    if (sectionIds.length > 0) {
      const lessonsResult = await supabase
        .from("lessons")
        .select("id, section_id, level, slug, title, sort_order")
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true });

      if (lessonsResult.error) throw lessonsResult.error;
      lessons = lessonsResult.data;
    }

    const lessonIds = lessons.map((l) => l.id);

    let contents = [];
    if (lessonIds.length > 0) {
      const contentsResult = await supabase
        .from("contents")
        .select(
          "id, lesson_id, type, slug, title, body_html, question_text, correct_answer, explanation_correct, explanation_wrong, sort_order"
        )
        .in("lesson_id", lessonIds)
        .order("sort_order", { ascending: true });

      if (contentsResult.error) throw contentsResult.error;
      contents = contentsResult.data;
    }

    const questionContentIds = contents.filter((c) => c.type === "question").map((c) => c.id);

    let choices = [];
    if (questionContentIds.length > 0) {
      const choicesResult = await supabase
        .from("content_choices")
        .select("id, content_id, option_key, option_text, sort_order")
        .in("content_id", questionContentIds)
        .order("sort_order", { ascending: true });

      if (choicesResult.error) throw choicesResult.error;
      choices = choicesResult.data;
    }

    const choicesByContentId = choices.reduce((acc, choice) => {
      if (!acc[choice.content_id]) acc[choice.content_id] = [];
      acc[choice.content_id].push(choice);
      return acc;
    }, {});

    const contentsByLessonId = contents.reduce((acc, content) => {
      if (!acc[content.lesson_id]) acc[content.lesson_id] = [];
      acc[content.lesson_id].push({
        ...normalizeContentRow(content),
        choices: choicesByContentId[content.id] || [],
      });
      return acc;
    }, {});

    const lessonsBySectionId = lessons.reduce((acc, lesson) => {
      if (!acc[lesson.section_id]) acc[lesson.section_id] = [];
      acc[lesson.section_id].push({
        ...lesson,
        contents: contentsByLessonId[lesson.id] || [],
      });
      return acc;
    }, {});

    let bosses = [];
    if (sectionIds.length > 0) {
      const bossResult = await supabase
        .from("bosses")
        .select("id, section_id, type, slug, title, question_text")
        .in("section_id", sectionIds);

      if (bossResult.error) throw bossResult.error;
      bosses = bossResult.data;
    }

    const bossIds = bosses.map((b) => b.id);

    let expectedPoints = [];
    if (bossIds.length > 0) {
      const pointsResult = await supabase
        .from("boss_expected_points")
        .select("boss_id, point_text, sort_order")
        .in("boss_id", bossIds)
        .order("sort_order", { ascending: true });

      if (pointsResult.error) throw pointsResult.error;
      expectedPoints = pointsResult.data;
    }

    const pointsByBossId = expectedPoints.reduce((acc, point) => {
      if (!acc[point.boss_id]) acc[point.boss_id] = [];
      acc[point.boss_id].push(point.point_text);
      return acc;
    }, {});

    const bossBySectionId = bosses.reduce((acc, boss) => {
      acc[boss.section_id] = {
        type: boss.type,
        slug: boss.slug,
        title: boss.title,
        question: boss.question_text,
        expectedPoints: pointsByBossId[boss.id] || [],
      };
      return acc;
    }, {});

    const fullChapter = {
      ...chapter,
      sections: sections.map((section) => ({
        ...section,
        lessons: lessonsBySectionId[section.id] || [],
        boss: bossBySectionId[section.id] || null,
      })),
    };

    return ok(res, fullChapter);
  })
);

router.get(
  "/sections/:sectionSlug",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { sectionSlug } = req.params;

    const { data, error } = await supabase
      .from("sections")
      .select("id, chapter_id, level, slug, title, is_final_boss, sort_order")
      .eq("slug", sectionSlug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return notFound(res, "Section not found");

    return ok(res, data);
  })
);

router.get(
  "/chapters/:chapterSlug/sections",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { chapterSlug } = req.params;

    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .select("id")
      .eq("slug", chapterSlug)
      .maybeSingle();

    if (chapterError) throw chapterError;
    if (!chapter) return notFound(res, "Chapter not found");

    const { data, error } = await supabase
      .from("sections")
      .select("id, chapter_id, level, slug, title, is_final_boss, sort_order")
      .eq("chapter_id", chapter.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return ok(res, data);
  })
);

router.get(
  "/lessons/:lessonSlug",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { lessonSlug } = req.params;

    const { data, error } = await supabase
      .from("lessons")
      .select("id, section_id, level, slug, title, sort_order")
      .eq("slug", lessonSlug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return notFound(res, "Lesson not found");

    return ok(res, data);
  })
);

router.get(
  "/sections/:sectionSlug/lessons",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { sectionSlug } = req.params;

    const { data: section, error: sectionError } = await supabase
      .from("sections")
      .select("id")
      .eq("slug", sectionSlug)
      .maybeSingle();

    if (sectionError) throw sectionError;
    if (!section) return notFound(res, "Section not found");

    const { data, error } = await supabase
      .from("lessons")
      .select("id, section_id, level, slug, title, sort_order")
      .eq("section_id", section.id)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return ok(res, data);
  })
);

router.get(
  "/lessons/:lessonSlug/full",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { lessonSlug } = req.params;

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, section_id, level, slug, title, sort_order")
      .eq("slug", lessonSlug)
      .maybeSingle();

    if (lessonError) throw lessonError;
    if (!lesson) return notFound(res, "Lesson not found");

    const { data: contents, error: contentsError } = await supabase
      .from("contents")
      .select(
        "id, lesson_id, type, slug, title, body_html, question_text, correct_answer, explanation_correct, explanation_wrong, sort_order"
      )
      .eq("lesson_id", lesson.id)
      .order("sort_order", { ascending: true });

    if (contentsError) throw contentsError;

    const questionContentIds = contents.filter((c) => c.type === "question").map((c) => c.id);
    let choices = [];

    if (questionContentIds.length > 0) {
      const choicesResult = await supabase
        .from("content_choices")
        .select("id, content_id, option_key, option_text, sort_order")
        .in("content_id", questionContentIds)
        .order("sort_order", { ascending: true });

      if (choicesResult.error) throw choicesResult.error;
      choices = choicesResult.data;
    }

    const choicesByContentId = choices.reduce((acc, choice) => {
      if (!acc[choice.content_id]) acc[choice.content_id] = [];
      acc[choice.content_id].push(choice);
      return acc;
    }, {});

    return ok(res, {
      ...lesson,
      contents: contents.map((content) => ({
        ...normalizeContentRow(content),
        choices: choicesByContentId[content.id] || [],
      })),
    });
  })
);

router.get(
  "/contents/:contentSlug",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { contentSlug } = req.params;

    const { data: content, error: contentError } = await supabase
      .from("contents")
      .select(
        "id, lesson_id, type, slug, title, body_html, question_text, correct_answer, explanation_correct, explanation_wrong, sort_order"
      )
      .eq("slug", contentSlug)
      .maybeSingle();

    if (contentError) throw contentError;
    if (!content) return notFound(res, "Content not found");

    let choices = [];

    if (content.type === "question") {
      const choicesResult = await supabase
        .from("content_choices")
        .select("id, content_id, option_key, option_text, sort_order")
        .eq("content_id", content.id)
        .order("sort_order", { ascending: true });

      if (choicesResult.error) throw choicesResult.error;
      choices = choicesResult.data;
    }

    return ok(res, {
      ...normalizeContentRow(content),
      choices,
    });
  })
);

router.get(
  "/lessons/:lessonSlug/contents",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { lessonSlug } = req.params;
    const { type } = req.query;

    if (type && type !== "material" && type !== "question") {
      return badRequest(res, "Query param 'type' must be either 'material' or 'question'.");
    }

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id")
      .eq("slug", lessonSlug)
      .maybeSingle();

    if (lessonError) throw lessonError;
    if (!lesson) return notFound(res, "Lesson not found");

    let query = supabase
      .from("contents")
      .select(
        "id, lesson_id, type, slug, title, body_html, question_text, correct_answer, explanation_correct, explanation_wrong, sort_order"
      )
      .eq("lesson_id", lesson.id)
      .order("sort_order", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    const { data: contents, error: contentsError } = await query;
    if (contentsError) throw contentsError;

    const questionContentIds = contents.filter((c) => c.type === "question").map((c) => c.id);
    let choices = [];

    if (questionContentIds.length > 0) {
      const choicesResult = await supabase
        .from("content_choices")
        .select("id, content_id, option_key, option_text, sort_order")
        .in("content_id", questionContentIds)
        .order("sort_order", { ascending: true });

      if (choicesResult.error) throw choicesResult.error;
      choices = choicesResult.data;
    }

    const choicesByContentId = choices.reduce((acc, choice) => {
      if (!acc[choice.content_id]) acc[choice.content_id] = [];
      acc[choice.content_id].push(choice);
      return acc;
    }, {});

    return ok(
      res,
      contents.map((content) => ({
        ...normalizeContentRow(content),
        choices: choicesByContentId[content.id] || [],
      }))
    );
  })
);

router.post(
  "/answers",
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorized(res, "Bearer token is required for answering questions.");
    }

    const supabase = getSupabaseClient(req);
    const { contentSlug, selectedOption } = req.body;

    if (!contentSlug || !selectedOption) {
      return badRequest(res, "Request body requires contentSlug and selectedOption.");
    }

    const { data: content, error: contentError } = await supabase
      .from("contents")
      .select("id, slug, type, correct_answer, explanation_correct, explanation_wrong")
      .eq("slug", contentSlug)
      .maybeSingle();

    if (contentError) throw contentError;
    if (!content) return notFound(res, "Content not found");
    if (content.type !== "question") return badRequest(res, "This content is not a question.");

    const { data: choice, error: choiceError } = await supabase
      .from("content_choices")
      .select("option_key")
      .eq("content_id", content.id)
      .eq("option_key", selectedOption)
      .maybeSingle();

    if (choiceError) throw choiceError;
    if (!choice) return badRequest(res, "Invalid selectedOption for this question.");

    const isCorrect = selectedOption === content.correct_answer;

    const { error: upsertError } = await supabase.from("answers").upsert(
      {
        user_id: user.id,
        content_id: content.id,
        selected_option: selectedOption,
        is_correct: isCorrect,
      },
      { onConflict: "user_id,content_id" }
    );

    if (upsertError) throw upsertError;

    return ok(res, {
      contentSlug: content.slug,
      selectedOption,
      isCorrect,
      explanation: isCorrect ? content.explanation_correct : content.explanation_wrong,
    });
  })
);

router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorized(res, "Bearer token is required for viewing profile.");
    }

    const supabase = getSupabaseClient(req);

    const [correctAnswersResult, completedLessonsResult, bossSubmissionsResult] = await Promise.all([
      supabase
        .from("answers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_correct", true),
      supabase
        .from("lesson_progress")
        .select("lesson_id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed"),
      supabase
        .from("boss_submissions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    if (correctAnswersResult.error) throw correctAnswersResult.error;
    if (completedLessonsResult.error) throw completedLessonsResult.error;
    if (bossSubmissionsResult.error) throw bossSubmissionsResult.error;

    const correctAnswers = correctAnswersResult.count || 0;
    const completedLessons = completedLessonsResult.count || 0;
    const bossSubmissions = bossSubmissionsResult.count || 0;

    const points =
      correctAnswers * POINTS_PER_CORRECT_ANSWER +
      completedLessons * POINTS_PER_COMPLETED_LESSON +
      bossSubmissions * POINTS_PER_BOSS_SUBMISSION;

    const currentRank = getProfileRank(points);
    const currentRankIndex = LEVEL_LIST.findIndex((rank) => rank.level === currentRank.level);
    const nextRank =
      currentRankIndex >= 0 && currentRankIndex < LEVEL_LIST.length - 1
        ? LEVEL_LIST[currentRankIndex + 1]
        : null;

    return ok(res, {
      userId: user.id,
      points,
      level: currentRank.level,
      rank: currentRank.rank,
      breakdown: {
        correctAnswers,
        completedLessons,
        bossSubmissions,
        pointsPerCorrectAnswer: POINTS_PER_CORRECT_ANSWER,
        pointsPerCompletedLesson: POINTS_PER_COMPLETED_LESSON,
        pointsPerBossSubmission: POINTS_PER_BOSS_SUBMISSION,
      },
      nextRank: nextRank
        ? {
            level: nextRank.level,
            rank: nextRank.rank,
            requiredPoints: nextRank.min,
            pointsToNextRank: Math.max(nextRank.min - points, 0),
          }
        : null,
    });
  })
);

router.get(
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);

    // Use RPC function to get leaderboard data
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .rpc('get_leaderboard');

    if (leaderboardError) throw leaderboardError;

    // Format the response
    const leaderboard = leaderboardData.map((row, index) => ({
      userId: row.user_id,
      email: row.email,
      points: parseInt(row.points),
      rank: getProfileRank(parseInt(row.points)).rank,
      level: getProfileRank(parseInt(row.points)).level,
      position: index + 1,
    }));

    return ok(res, {
      leaderboard,
      totalUsers: leaderboard.length,
    });
  })
);

router.get(
  "/leaderboard",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);

    // Use RPC function to get leaderboard data
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .rpc('get_leaderboard');

    if (leaderboardError) throw leaderboardError;

    // Format the response
    const leaderboard = leaderboardData.map((row, index) => ({
      userId: row.user_id,
      email: row.email,
      points: parseInt(row.points),
      rank: getProfileRank(parseInt(row.points)).rank,
      level: getProfileRank(parseInt(row.points)).level,
      position: index + 1,
    }));

    return ok(res, {
      leaderboard,
      totalUsers: leaderboard.length,
    });
  })
);

router.get(
  "/streaks",
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorized(res, "Bearer token is required for viewing streaks.");
    }

    const supabase = getSupabaseClient(req);

    // Get user's streak data
    const { data: streakData, error: streakError } = await supabase
      .from("streaks")
      .select("current_streak, max_streak, last_activity_date")
      .eq("user_id", user.id)
      .single();

    if (streakError && streakError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw streakError;
    }

    // If no streak data exists, initialize with 0
    const currentStreak = streakData?.current_streak || 0;
    const maxStreak = streakData?.max_streak || 0;
    const lastActivityDate = streakData?.last_activity_date;

    // Calculate if streak is still active (activity within last 24 hours)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const isStreakActive = lastActivityDate && new Date(lastActivityDate) >= yesterday;

    return ok(res, {
      userId: user.id,
      currentStreak,
      maxStreak,
      lastActivityDate,
      isStreakActive,
      streakStatus: isStreakActive ? "active" : "broken",
    });
  })
);

router.post(
  "/complete-boss",
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorized(res, "Bearer token is required for completing boss.");
    }

    const { section, isCompleted } = req.body;

    if (!section || typeof isCompleted !== 'boolean') {
      return badRequest(res, "Section ID and isCompleted (boolean) are required.");
    }

    if (!isCompleted) {
      return badRequest(res, "isCompleted must be true to complete the section.");
    }

    const supabase = getSupabaseClient(req);

    // Get section by ID
    const { data: sectionData, error: sectionError } = await supabase
      .from("sections")
      .select("id, slug, title")
      .eq("id", section)
      .single();

    if (sectionError) {
      if (sectionError.code === 'PGRST116') {
        return notFound(res, `Section with ID '${section}' not found.`);
      }
      throw sectionError;
    }

    // Complete the section
    const { error: updateError } = await supabase
      .from("section_progress")
      .upsert({
        user_id: user.id,
        section_id: sectionData.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (updateError) {
      throw updateError;
    }

    return ok(res, {
      message: "Section completed successfully",
      section: {
        id: sectionData.id,
        slug: sectionData.slug,
        title: sectionData.title,
      },
      userId: user.id,
      completedAt: new Date().toISOString(),
    });
  })
);

router.get(
  "/progress",
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorized(res, "Bearer token is required for viewing progress.");
    }

    const supabase = getSupabaseClient(req);

    const [
      lessonTotalResult,
      contentTotalResult,
      lessonProgressResult,
      contentProgressResult,
      lessonProgressWithDetailsResult,
      sectionsWithCountResult,
      chaptersWithCountResult,
    ] = await Promise.all([
      supabase.from("lessons").select("id", { count: "exact", head: true }),
      supabase.from("contents").select("id", { count: "exact", head: true }),
      supabase
        .from("lesson_progress")
        .select("lesson_id, status, last_content_id, completed_at, updated_at")
        .eq("user_id", user.id),
      supabase
        .from("content_progress")
        .select("content_id, is_completed, completed_at, updated_at")
        .eq("user_id", user.id),
      supabase
        .from("lesson_progress")
        .select("status, lessons!inner(id, slug, title, section_id, sections!inner(id, slug, title, chapter_id, chapters!inner(id, slug, title)))")
        .eq("user_id", user.id),
      supabase
        .from("sections")
        .select("id, slug, title, chapter_id, lessons(count)")
        .order("sort_order"),
      supabase
        .from("chapters")
        .select("id, slug, title, sections(count)")
        .order("sort_order"),
    ]);

    if (lessonTotalResult.error) throw lessonTotalResult.error;
    if (contentTotalResult.error) throw contentTotalResult.error;
    if (lessonProgressResult.error) throw lessonProgressResult.error;
    if (contentProgressResult.error) throw contentProgressResult.error;
    if (lessonProgressWithDetailsResult.error) throw lessonProgressWithDetailsResult.error;
    if (sectionsWithCountResult.error) throw sectionsWithCountResult.error;
    if (chaptersWithCountResult.error) throw chaptersWithCountResult.error;

    const sectionTotals = new Map();
    for (const sec of sectionsWithCountResult.data) {
      sectionTotals.set(sec.id, {
        totalLessons: sec.lessons?.[0]?.count || 0,
        chapterId: sec.chapter_id,
      });
    }

    const chapterTotals = new Map();
    for (const chap of chaptersWithCountResult.data) {
      chapterTotals.set(chap.id, {
        totalSections: chap.sections?.[0]?.count || 0,
      });
    }

    const sectionProgressMap = new Map();
    const chapterProgressMap = new Map();

    for (const row of lessonProgressWithDetailsResult.data) {
      const lesson = row.lessons;
      const section = lesson.sections;
      const chapter = section.chapters;

      // Section progress
      if (!sectionProgressMap.has(section.id)) {
        sectionProgressMap.set(section.id, {
          id: section.id,
          slug: section.slug,
          title: section.title,
          status: "not_started",
          totalLessons: sectionTotals.get(section.id)?.totalLessons || 0,
          completedLessons: 0,
        });
      }
      const secProg = sectionProgressMap.get(section.id);
      if (row.status === "completed") {
        secProg.completedLessons++;
      }

      // Chapter progress init
      if (!chapterProgressMap.has(chapter.id)) {
        chapterProgressMap.set(chapter.id, {
          id: chapter.id,
          slug: chapter.slug,
          title: chapter.title,
          status: "not_started",
          totalSections: chapterTotals.get(chapter.id)?.totalSections || 0,
          completedSections: 0,
        });
      }
    }

    // Calculate section statuses
    for (const sec of sectionProgressMap.values()) {
      if (sec.completedLessons === sec.totalLessons && sec.totalLessons > 0) {
        sec.status = "completed";
      } else if (sec.completedLessons > 0) {
        sec.status = "in_progress";
      }
    }

    // Calculate chapter statuses based on sections
    for (const sec of sectionProgressMap.values()) {
      const chapId = sectionTotals.get(sec.id)?.chapterId;
      if (chapId && chapterProgressMap.has(chapId)) {
        const chap = chapterProgressMap.get(chapId);
        if (sec.status === "completed") {
          chap.completedSections++;
        }
      }
    }

    for (const chap of chapterProgressMap.values()) {
      if (chap.completedSections === chap.totalSections && chap.totalSections > 0) {
        chap.status = "completed";
      } else if (chap.completedSections > 0) {
        chap.status = "in_progress";
      }
    }

    const completedLessons = lessonProgressResult.data.filter(
      (row) => row.status === "completed"
    ).length;

    const completedContents = contentProgressResult.data.filter((row) => row.is_completed).length;

    return ok(res, {
      summary: {
        totalLessons: lessonTotalResult.count || 0,
        completedLessons,
        totalContents: contentTotalResult.count || 0,
        completedContents,
      },
      levels: LEVEL_LIST,
      chapterProgress: Array.from(chapterProgressMap.values()),
      sectionProgress: Array.from(sectionProgressMap.values()),
      lessonProgress: lessonProgressResult.data,
      contentProgress: contentProgressResult.data,
    });
  })
);

router.post(
  "/progress/lesson/:lessonSlug",
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorized(res, "Bearer token is required for updating lesson progress.");
    }

    const supabase = getSupabaseClient(req);
    const { lessonSlug } = req.params;
    const { status = "in_progress", lastContentSlug = null } = req.body;

    if (!["not_started", "in_progress", "completed"].includes(status)) {
      return badRequest(res, "status must be one of: not_started, in_progress, completed.");
    }

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id")
      .eq("slug", lessonSlug)
      .maybeSingle();

    if (lessonError) throw lessonError;
    if (!lesson) return notFound(res, "Lesson not found");

    let lastContentId = null;
    if (lastContentSlug) {
      const { data: lastContent, error: contentError } = await supabase
        .from("contents")
        .select("id, lesson_id")
        .eq("slug", lastContentSlug)
        .maybeSingle();

      if (contentError) throw contentError;
      if (!lastContent || lastContent.lesson_id !== lesson.id) {
        return badRequest(res, "lastContentSlug is invalid for this lesson.");
      }

      lastContentId = lastContent.id;
    }

    const payload = {
      user_id: user.id,
      lesson_id: lesson.id,
      status,
      last_content_id: lastContentId,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("lesson_progress")
      .upsert(payload, { onConflict: "user_id,lesson_id" })
      .select("user_id, lesson_id, status, last_content_id, completed_at, updated_at")
      .single();

    if (error) throw error;
    return ok(res, data);
  })
);

router.post(
  "/progress/content/:contentSlug",
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorized(res, "Bearer token is required for updating content progress.");
    }

    const supabase = getSupabaseClient(req);
    const { contentSlug } = req.params;
    const { isCompleted = true } = req.body;

    if (typeof isCompleted !== "boolean") {
      return badRequest(res, "isCompleted must be boolean.");
    }

    const { data: content, error: contentError } = await supabase
      .from("contents")
      .select("id")
      .eq("slug", contentSlug)
      .maybeSingle();

    if (contentError) throw contentError;
    if (!content) return notFound(res, "Content not found");

    const payload = {
      user_id: user.id,
      content_id: content.id,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from("content_progress")
      .upsert(payload, { onConflict: "user_id,content_id" })
      .select("user_id, content_id, is_completed, completed_at, updated_at")
      .single();

    if (error) throw error;
    return ok(res, data);
  })
);

router.get(
  "/sections/:sectionSlug/boss",
  asyncHandler(async (req, res) => {
    const supabase = getSupabaseClient(req);
    const { sectionSlug } = req.params;

    const { data: section, error: sectionError } = await supabase
      .from("sections")
      .select("id, slug")
      .eq("slug", sectionSlug)
      .maybeSingle();

    if (sectionError) throw sectionError;
    if (!section) return notFound(res, "Section not found");

    const { data: boss, error: bossError } = await supabase
      .from("bosses")
      .select("id, section_id, type, slug, title, question_text")
      .eq("section_id", section.id)
      .maybeSingle();

    if (bossError) throw bossError;
    if (!boss) return notFound(res, "Boss not found for this section");

    const { data: points, error: pointsError } = await supabase
      .from("boss_expected_points")
      .select("point_text, sort_order")
      .eq("boss_id", boss.id)
      .order("sort_order", { ascending: true });

    if (pointsError) throw pointsError;

    return ok(res, {
      type: boss.type,
      slug: boss.slug,
      title: boss.title,
      question: boss.question_text,
      expectedPoints: points.map((p) => p.point_text),
    });
  })
);

router.post(
  "/boss/:bossSlug/submit",
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return unauthorized(res, "Bearer token is required for boss submission.");
    }

    const supabase = getSupabaseClient(req);
    const { bossSlug } = req.params;
    const { answerText } = req.body;

    if (!answerText || typeof answerText !== "string") {
      return badRequest(res, "answerText is required.");
    }

    const { data: boss, error: bossError } = await supabase
      .from("bosses")
      .select("id, slug")
      .eq("slug", bossSlug)
      .maybeSingle();

    if (bossError) throw bossError;
    if (!boss) return notFound(res, "Boss not found");

    const { data, error } = await supabase
      .from("boss_submissions")
      .insert({
        user_id: user.id,
        boss_id: boss.id,
        answer_text: answerText,
        status: "submitted",
      })
      .select("id, user_id, boss_id, status, submitted_at")
      .single();

    if (error) throw error;

    return ok(res, data, 201);
  })
);

module.exports = router;
