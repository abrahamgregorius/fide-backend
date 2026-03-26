-- Query to show progress for all test users
-- This shows the current state of all progress data we seeded

-- First, let's see the user_progress table (overall stats)
SELECT
    up.user_id,
    CASE
        WHEN up.user_id = '76231f7e-7e1c-4105-80e6-06d8641bc13f' THEN 'Alva (High Performer)'
        WHEN up.user_id = '72bf47b6-a434-4258-a978-3c04dde48423' THEN 'Abraham (Good Performer)'
        WHEN up.user_id = '23774dfe-1b4e-44a7-b8dc-2509ecd5c14f' THEN 'Richard (Average Performer)'
        WHEN up.user_id = '92373470-2b9b-44a2-90a2-af4b446dbca0' THEN 'Martin (Top Performer)'
        ELSE 'Unknown User'
    END as user_name,
    up.total_points,
    up.current_streak,
    up.longest_streak,
    up.last_activity_at
FROM public.user_progress up
ORDER BY up.total_points DESC;

-- Section progress summary for each user
SELECT
    CASE
        WHEN sp.user_id = '76231f7e-7e1c-4105-80e6-06d8641bc13f' THEN 'Alva (High Performer)'
        WHEN sp.user_id = '72bf47b6-a434-4258-a978-3c04dde48423' THEN 'Abraham (Good Performer)'
        WHEN sp.user_id = '23774dfe-1b4e-44a7-b8dc-2509ecd5c14f' THEN 'Richard (Average Performer)'
        WHEN sp.user_id = '92373470-2b9b-44a2-90a2-af4b446dbca0' THEN 'Martin (Top Performer)'
        ELSE 'Unknown User'
    END as user_name,
    s.title as section_title,
    sp.status,
    sp.completed_at
FROM public.section_progress sp
JOIN public.sections s ON sp.section_id = s.id
ORDER BY sp.user_id, s.sort_order;

-- Content progress summary (completed questions)
SELECT
    CASE
        WHEN cp.user_id = '76231f7e-7e1c-4105-80e6-06d8641bc13f' THEN 'Alva (High Performer)'
        WHEN cp.user_id = '72bf47b6-a434-4258-a978-3c04dde48423' THEN 'Abraham (Good Performer)'
        WHEN cp.user_id = '23774dfe-1b4e-44a7-b8dc-2509ecd5c14f' THEN 'Richard (Average Performer)'
        WHEN cp.user_id = '92373470-2b9b-44a2-90a2-af4b446dbca0' THEN 'Martin (Top Performer)'
        ELSE 'Unknown User'
    END as user_name,
    COUNT(*) as completed_questions
FROM public.content_progress cp
WHERE cp.is_completed = true
GROUP BY cp.user_id
ORDER BY completed_questions DESC;

-- Answers summary (correct vs total attempts)
SELECT
    CASE
        WHEN a.user_id = '76231f7e-7e1c-4105-80e6-06d8641bc13f' THEN 'Alva (High Performer)'
        WHEN a.user_id = '72bf47b6-a434-4258-a978-3c04dde48423' THEN 'Abraham (Good Performer)'
        WHEN a.user_id = '23774dfe-1b4e-44a7-b8dc-2509ecd5c14f' THEN 'Richard (Average Performer)'
        WHEN a.user_id = '92373470-2b9b-44a2-90a2-af4b446dbca0' THEN 'Martin (Top Performer)'
        ELSE 'Unknown User'
    END as user_name,
    COUNT(*) as total_answers,
    SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) as correct_answers,
    ROUND((SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END)::decimal / COUNT(*)::decimal) * 100, 1) as accuracy_percentage
FROM public.answers a
GROUP BY a.user_id
ORDER BY correct_answers DESC;

-- Boss submissions summary
SELECT
    CASE
        WHEN bs.user_id = '76231f7e-7e1c-4105-80e6-06d8641bc13f' THEN 'Alva (High Performer)'
        WHEN bs.user_id = '72bf47b6-a434-4258-a978-3c04dde48423' THEN 'Abraham (Good Performer)'
        WHEN bs.user_id = '23774dfe-1b4e-44a7-b8dc-2509ecd5c14f' THEN 'Richard (Average Performer)'
        WHEN bs.user_id = '92373470-2b9b-44a2-90a2-af4b446dbca0' THEN 'Martin (Top Performer)'
        ELSE 'Unknown User'
    END as user_name,
    b.title as boss_title,
    bs.submission_text,
    bs.points_earned,
    bs.submitted_at
FROM public.boss_submissions bs
JOIN public.bosses b ON bs.boss_id = b.id
ORDER BY bs.points_earned DESC;

-- Overall progress summary (what the /progress endpoint would return)
WITH user_summary AS (
    SELECT
        up.user_id,
        CASE
            WHEN up.user_id = '76231f7e-7e1c-4105-80e6-06d8641bc13f' THEN 'Alva (High Performer)'
            WHEN up.user_id = '72bf47b6-a434-4258-a978-3c04dde48423' THEN 'Abraham (Good Performer)'
            WHEN up.user_id = '23774dfe-1b4e-44a7-b8dc-2509ecd5c14f' THEN 'Richard (Average Performer)'
            WHEN up.user_id = '92373470-2b9b-44a2-90a2-af4b446dbca0' THEN 'Martin (Top Performer)'
            ELSE 'Unknown User'
        END as user_name,
        up.total_points,
        up.current_streak,
        up.longest_streak,
        (SELECT COUNT(*) FROM public.lesson_progress lp WHERE lp.user_id = up.user_id AND lp.status = 'completed') as completed_lessons,
        (SELECT COUNT(*) FROM public.content_progress cp WHERE cp.user_id = up.user_id AND cp.is_completed = true) as completed_contents,
        (SELECT COUNT(*) FROM public.answers a WHERE a.user_id = up.user_id AND a.is_correct = true) as correct_answers,
        (SELECT COUNT(*) FROM public.boss_submissions bs WHERE bs.user_id = up.user_id) as boss_submissions
    FROM public.user_progress up
)
SELECT
    user_name,
    total_points,
    current_streak,
    longest_streak,
    completed_lessons,
    completed_contents,
    correct_answers,
    boss_submissions,
    -- Calculate points breakdown
    (correct_answers * 10) as points_from_answers,
    (completed_lessons * 50) as points_from_lessons,
    (boss_submissions * 100) as points_from_bosses,
    -- Verify points calculation
    ((correct_answers * 10) + (completed_lessons * 50) + (boss_submissions * 100)) as calculated_total_points
FROM user_summary
ORDER BY total_points DESC;