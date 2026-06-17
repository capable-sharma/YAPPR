-- ==========================================
-- YAPPR VOCABULARY SEED DATA
-- Representative subset of advanced business/placement words
-- ==========================================

INSERT INTO public.vocabulary_words (word, ipa, part_of_speech, definition, example_sentence, category, difficulty_level) VALUES
('Ubiquitous', '/juːˈbɪkwɪtəs/', 'adj.', 'Present everywhere.', 'Smartphones are now ubiquitous in urban India.', 'GRE Power Words', 3),
('Ephemeral', '/ɪˈfɛmərəl/', 'adj.', 'Lasting a very short time.', 'Viral fame is often ephemeral.', 'GRE Power Words', 4),
('Pragmatic', '/præɡˈmætɪk/', 'adj.', 'Dealing with things sensibly and realistically.', 'We need a pragmatic approach, not idealism.', 'GRE Power Words', 3),
('Cogent', '/ˈkoʊdʒənt/', 'adj.', 'Clear, logical, and convincing.', 'She made a cogent argument for remote work.', 'GRE Power Words', 4),
('Synergy', '/ˈsɪnərdʒi/', 'noun', 'Combined effect greater than sum of parts.', 'The merger created real synergy across teams.', 'Corporate Boardroom', 2),
('Leverage', '/ˈlɛvərɪdʒ/', 'verb', 'Use to maximum advantage.', 'We must leverage our brand equity.', 'Corporate Boardroom', 2),
('Bandwidth', '/ˈbændwɪdθ/', 'noun', 'Capacity to handle work.', 'I don''t have the bandwidth this quarter.', 'Corporate Boardroom', 1),
('Streamline', '/ˈstriːmlaɪn/', 'verb', 'Make more efficient.', 'We streamlined onboarding to two days.', 'Corporate Boardroom', 2),
('Candid', '/ˈkændɪd/', 'adj.', 'Truthful and straightforward.', 'His candid feedback changed our roadmap.', 'SAT Essentials', 2),
('Mitigate', '/ˈmɪtɪɡeɪt/', 'verb', 'Make less severe.', 'We added tests to mitigate regressions.', 'SAT Essentials', 3),
('Arduous', '/ˈɑːrdʒuəs/', 'adj.', 'Requiring great effort.', 'The trek was arduous but worth it.', 'SAT Essentials', 4),
('Holistic', '/hoʊˈlɪstɪk/', 'adj.', 'Considering the whole, not just parts.', 'We took a holistic view of the supply chain.', 'Consulting Lingo', 3),
('Actionable', '/ˈækʃənəbl/', 'adj.', 'Able to be acted upon.', 'Give me one actionable insight.', 'Consulting Lingo', 2),
('MECE', '/ˈmiːsi/', 'adj.', 'Mutually exclusive, collectively exhaustive.', 'Make sure the buckets are MECE.', 'Consulting Lingo', 5),
('Hypothesis', '/haɪˈpɒθəsɪs/', 'noun', 'A testable proposed answer.', 'Let''s hypothesis-test before we model.', 'Consulting Lingo', 3)
ON CONFLICT (word) DO NOTHING;
