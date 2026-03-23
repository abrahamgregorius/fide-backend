    -- Seed data for FIDE backend (idempotent)

    begin;

    insert into public.chapters (level, slug, title, description, image_url, sort_order)
    values (
    'I',
    'god',
    'God',
    'Exploring the human longing for the divine, the proofs of God''s existence through reason, and the mystery of the Holy Trinity.',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQsRIeXT-rY4KLHFB8UKy7c00g-Wo97qsSOsSevQsbsyGSlGLfd1NH2wiZ1MvMtdpwAT5jHeYGUEP40HMsZ8WxdPDWHlL26&s&ec=121584914',
    1
    )
    on conflict (slug) do update
    set
    level = excluded.level,
    title = excluded.title,
    description = excluded.description,
    image_url = excluded.image_url,
    sort_order = excluded.sort_order;

    insert into public.sections (chapter_id, level, slug, title, is_final_boss, sort_order)
    select c.id, x.level, x.slug, x.title, x.is_final_boss, x.sort_order
    from public.chapters c
    join (
    values
        ('I', 'desire-and-reason', 'Desire, Reason, and Proofs', false, 1),
        ('II', 'the-nature-of-god', 'The Nature and Mystery of God', false, 2),
        ('X', 'final-boss-the-trinity-and-reason', 'Final Boss: The Mystery of the Godhead', true, 99)
    ) as x(level, slug, title, is_final_boss, sort_order)
    on c.slug = 'god'
    on conflict (slug) do update
    set
    chapter_id = excluded.chapter_id,
    level = excluded.level,
    title = excluded.title,
    is_final_boss = excluded.is_final_boss,
    sort_order = excluded.sort_order;

    insert into public.lessons (section_id, level, slug, title, sort_order)
    select s.id, x.level, x.slug, x.title, x.sort_order
    from public.sections s
    join (
    values
        ('desire-and-reason', 'I', 'the-infinite-longing', 'The Infinite Longing', 1),
        ('desire-and-reason', 'II', 'st-thomas-aquinas-proofs', 'St. Thomas Aquinas: The Five Ways', 2),
        ('the-nature-of-god', 'I', 'divine-attributes', 'The Attributes of God', 1)
    ) as x(section_slug, level, slug, title, sort_order)
    on s.slug = x.section_slug
    on conflict (slug) do update
    set
    section_id = excluded.section_id,
    level = excluded.level,
    title = excluded.title,
    sort_order = excluded.sort_order;

    insert into public.contents (
    lesson_id,
    type,
    slug,
    title,
    body_html,
    question_text,
    correct_answer,
    explanation_correct,
    explanation_wrong,
    sort_order
    )
    select
    l.id,
    x.type::public.content_type,
    x.slug,
    x.title,
    x.body_html,
    x.question_text,
    x.correct_answer,
    x.explanation_correct,
    x.explanation_wrong,
    x.sort_order
    from public.lessons l
    join (
    values
        ('the-infinite-longing', 'material', 'mat-1-1-1', 'The God-Shaped Vacuum', '<p>Blaise Pascal, a mathematician and philosopher, proposed that every human has an ''infinite abyss'' that can only be filled by God. This explains why material wealth never feels like ''enough''.</p>', null, null, null, null, 1),
        ('the-infinite-longing', 'question', 'q-1-1-1', null, null, 'What is the primary cause of human ''restlessness'' according to St. Augustine?', 'c', 'Augustine famously taught that our hearts are restless until they find their rest in God, because He is our origin and end.', 'While other factors exist, the theological root of restlessness is our innate orientation toward the Infinite.', 2),
        ('the-infinite-longing', 'material', 'mat-1-1-2', 'Universal Religious Impulse', '<p>Anthropology shows that no culture has ever been truly ''atheistic'' by nature. The search for a higher power is a universal human trait, suggesting it is part of our DNA.</p>', null, null, null, null, 3),
        ('the-infinite-longing', 'question', 'q-1-1-2', null, null, 'What does the universality of religion suggest about God?', 'b', 'The fact that all cultures seek the divine suggests an objective ''pull'' toward a Creator written in human nature.', 'History proves religion is not modern, and while cultures differ, the impulse to seek the divine remains constant.', 4),
        ('the-infinite-longing', 'material', 'mat-1-1-3', 'Transcendentals: Beauty', '<p>When we encounter objective beauty-a sunset, a symphony, or a selfless act-we experience a ''longing'' for something beyond the physical. This beauty is a reflection of God.</p>', null, null, null, null, 5),

        ('st-thomas-aquinas-proofs', 'material', 'mat-1-2-1', 'The Argument from Motion', '<p>Nothing moves itself. Every object in motion was put in motion by another. To avoid an infinite regress, there must be a First Mover: God.</p>', null, null, null, null, 1),
        ('st-thomas-aquinas-proofs', 'question', 'q-1-2-1', null, null, 'In the ''First Mover'' argument, why can''t the chain of causes go back forever?', 'b', 'Without a First Mover, there would be no second or third mover. An infinite chain without a source is logically impossible.', 'Logic is the tool used here, and time/scale are secondary to the metaphysical necessity of a primary cause.', 2),
        ('st-thomas-aquinas-proofs', 'material', 'mat-1-2-2', 'The Argument from Design', '<p>The universe acts with purpose and order (like the precise laws of physics). This ''teleology'' suggests an Intelligent Designer behind the cosmos.</p>', null, null, null, null, 3),
        ('st-thomas-aquinas-proofs', 'question', 'q-1-2-2', null, null, 'What does ''Teleology'' refer to in the proofs of God?', 'b', 'Teleology comes from the Greek ''telos'' (end/goal). It argues that the order in nature points to a purposeful mind.', 'Teleology is the opposite of randomness; it seeks the ''why'' and ''purpose'' behind the ''how''.', 4),
        ('st-thomas-aquinas-proofs', 'material', 'mat-1-2-3', 'The Argument from Contingency', '<p>Everything in the world can either ''be'' or ''not be''. Since things exist now, there must be one ''Necessary Being'' that must exist by its own nature.</p>', null, null, null, null, 5),

        ('divine-attributes', 'material', 'mat-2-1-1', 'God is Pure Spirit', '<p>God does not have a body. He is an infinite, intelligent, and free Spirit. This is why we cannot ''see'' Him with physical eyes.</p>', null, null, null, null, 1),
        ('divine-attributes', 'material', 'mat-2-1-2', 'God is Eternal', '<p>God has no beginning and no end. He exists in an ''Everlasting Now''. He created time, so He is not limited by it.</p>', null, null, null, null, 2),
        ('divine-attributes', 'question', 'q-2-1-1', null, null, 'What does it mean that God is ''Omnipresent''?', 'b', 'Since God sustains all things in existence, He is present to all things at every moment.', 'Limiting God to a location denies His infinite nature as the Creator of all space.', 3),
        ('divine-attributes', 'material', 'mat-2-1-3', 'God is Immutable', '<p>This means God does not change. He is always perfectly Good, perfectly True, and perfectly Loving. He cannot ''get better'' or ''get worse''.</p>', null, null, null, null, 4),
        ('divine-attributes', 'question', 'q-2-1-2', null, null, 'If God is ''Omniscient'', what does He know?', 'b', 'Omniscience means ''all-knowing''. Nothing is hidden from God''s intellect.', 'A God with limited knowledge would not be the Infinite Being.', 5)
    ) as x(
    lesson_slug,
    type,
    slug,
    title,
    body_html,
    question_text,
    correct_answer,
    explanation_correct,
    explanation_wrong,
    sort_order
    )
    on l.slug = x.lesson_slug
    on conflict (slug) do update
    set
    lesson_id = excluded.lesson_id,
    type = excluded.type,
    title = excluded.title,
    body_html = excluded.body_html,
    question_text = excluded.question_text,
    correct_answer = excluded.correct_answer,
    explanation_correct = excluded.explanation_correct,
    explanation_wrong = excluded.explanation_wrong,
    sort_order = excluded.sort_order;

    insert into public.content_choices (content_id, option_key, option_text, sort_order)
    select c.id, x.option_key, x.option_text, x.sort_order
    from public.contents c
    join (
    values
        ('q-1-1-1', 'a', 'Lack of physical exercise.', 1),
        ('q-1-1-1', 'b', 'Biological evolution.', 2),
        ('q-1-1-1', 'c', 'Being created for God and not yet resting in Him.', 3),
        ('q-1-1-1', 'd', 'Social anxiety.', 4),

        ('q-1-1-2', 'a', 'God is a myth used for control.', 1),
        ('q-1-1-2', 'b', 'Humans are naturally religious beings.', 2),
        ('q-1-1-2', 'c', 'Religion is a modern invention.', 3),
        ('q-1-1-2', 'd', 'All religions are exactly the same.', 4),

        ('q-1-2-1', 'a', 'Because time did not exist.', 1),
        ('q-1-2-1', 'b', 'Because an infinite regress provides no actual starting point for motion.', 2),
        ('q-1-2-1', 'c', 'Because the universe is too small.', 3),
        ('q-1-2-1', 'd', 'Because logic is limited.', 4),

        ('q-1-2-2', 'a', 'The study of old televisions.', 1),
        ('q-1-2-2', 'b', 'The idea that the universe has an end goal or purposeful design.', 2),
        ('q-1-2-2', 'c', 'The belief that everything is random.', 3),
        ('q-1-2-2', 'd', 'The study of human emotions.', 4),

        ('q-2-1-1', 'a', 'He is only in Heaven.', 1),
        ('q-2-1-1', 'b', 'He is everywhere at all times.', 2),
        ('q-2-1-1', 'c', 'He is inside the stars only.', 3),
        ('q-2-1-1', 'd', 'He is limited to certain holy buildings.', 4),

        ('q-2-1-2', 'a', 'Only things that happened in the past.', 1),
        ('q-2-1-2', 'b', 'Everything-past, present, and future, including our thoughts.', 2),
        ('q-2-1-2', 'c', 'Only what we tell Him in prayer.', 3),
        ('q-2-1-2', 'd', 'Most things, but not everything.', 4)
    ) as x(content_slug, option_key, option_text, sort_order)
    on c.slug = x.content_slug
    on conflict (content_id, option_key) do update
    set
    option_text = excluded.option_text,
    sort_order = excluded.sort_order;

    insert into public.bosses (section_id, type, slug, title, question_text)
    select
    s.id,
    'debate',
    'trinity-vs-logic-debate',
    'Theological Apologetics: Is the Trinity Logically Possible?',
    'Defend the Christian doctrine of the Holy Trinity against the charge of Logical Contradiction. How does the distinction between Nature (what a thing is) and Person (who a thing is) allow for one God in three Persons without falling into Tritheism (three gods) or Modalism (one god with three masks)?'
    from public.sections s
    where s.slug = 'final-boss-the-trinity-and-reason'
    on conflict (slug) do update
    set
    section_id = excluded.section_id,
    type = excluded.type,
    title = excluded.title,
    question_text = excluded.question_text;

    insert into public.boss_expected_points (boss_id, point_text, sort_order)
    select b.id, x.point_text, x.sort_order
    from public.bosses b
    join (
    values
        ('Distinction between Essence (Ousia) and Hypostasis (Personhood).', 1),
        ('The concept of Relations of Origin (Paternity, Filiation, Spiration).', 2),
        ('Perichoresis: The mutual indwelling and unity of operation among the three Persons.', 3),
        ('God as Ipsum Esse Subsistens (Subsistent Being Itself) which transcends finite numerical logic.', 4),
        ('Refutation of Modalism (denying distinction) and Tritheism (denying unity).', 5)
    ) as x(point_text, sort_order)
    on b.slug = 'trinity-vs-logic-debate'
    on conflict (boss_id, sort_order) do update
    set
    point_text = excluded.point_text;

    commit;
