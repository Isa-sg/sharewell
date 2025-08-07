-- Table: user_scores
CREATE TABLE user_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    total_points INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_post_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

-- Table: users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

-- Table: user_achievements
CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    achievement_type TEXT,
    achievement_name TEXT,
    achievement_description TEXT,
    points_awarded INTEGER DEFAULT 0,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

-- Table: sqlite_sequence
CREATE TABLE sqlite_sequence(name,seq);

-- Table: point_transactions
CREATE TABLE point_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    points INTEGER,
    reason TEXT,
    post_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (post_id) REFERENCES posts (id)
  );

-- Table: migrations
CREATE TABLE migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

-- Table: posts
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, source_url TEXT,
    FOREIGN KEY (created_by) REFERENCES users (id)
  );

-- Table: post_usage
CREATE TABLE post_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

INSERT INTO sqlite_sequence (name, seq) VALUES ('users', 2);
INSERT INTO sqlite_sequence (name, seq) VALUES ('posts', 112);
INSERT INTO sqlite_sequence (name, seq) VALUES ('migrations', 1);

INSERT INTO users (id, username, password, email, role, created_at) VALUES (1, 'Isa', '$2a$10$qst3fq8SZhyOh5QYveupE.DgPjebOWf5kd3czO8WLotfppvmIUzHu', 'isa.svalutoferro@gmail.com', 'user', '2025-07-17 17:21:05');
INSERT INTO users (id, username, password, email, role, created_at) VALUES (2, 'amp_news_bot', '', 'news@ampcode.com', 'admin', '2025-07-17 20:42:49');

INSERT INTO migrations (id, name, executed_at) VALUES (1, '001_add_indexes.js', '2025-08-04 19:38:44');

INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (72, '🎯 Development', '"I have a bug in these files: ... It shows up when I run this command: ... Help me fix this bug. Use the oracle as much as possible, since it''s smart."

We''ll see if this actually delivers.

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:03', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (73, '💻 AI Update', 'For those tracking AI developments: June 27, 2025 Better, Faster, Cheaper Summaries Amp now uses a different model when compacting or summarizing threads. It''s 4-6x faster, roughly 30x cheaper, and provides better su...

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:03', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (74, '🌟 Progress', 'June 26, 2025 Queued Messages You can now queue messages that will only be sent to the agent once it''s idle. To add a message to the queue, hold shift while submitting.

This changes everything! 🚀

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:03', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (75, '📈 Advancement', 'Technical update: Streamable Transport for MCP Amp now uses streamable HTTP transport for MCP servers by default with a fallback to Server-Sent Events. That allows you to connect to your own MCP ser...

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:25', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (76, '🔧 Enhancement', 'Multiple AGENT.md Files Amp now looks for AGENT.md files in subtrees, parent directories, and ~/.config/AGENT.md. This lets you keep your top-level AGENT.md general and create more...

Makes you wonder about the future of software development.

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:25', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (77, '⭐ Milestone', 'Oracle There''s something new in Amp''s toolbox: a tool called oracle. Behind that tool is a read-only subagent powered by one of the most powerful models today: OpenAI''s o3. o3 is s...

That''s it.

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:25', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (78, '🎪 Launch', '"Use the oracle to review the last commit''s changes. I want to make sure that the actual logic for when an idle or requires-user-input notification sound plays has not changed."

Miles ahead of the competition.

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:25', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (79, '📊 Analytics', '"Analyze how the functions foobar and barfoo are used. Then I want you to work a lot with the oracle to figure out how we can refactor the duplication between them while keeping ch...

What do you think this means?

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:25', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (80, '🛠️ Tools Update', 'So here''s what happened: "I have a bug in these files: ... It shows up when I run this command: ... Help me fix this bug. Use the oracle as much as possible, since it''s smart."

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:25', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (81, '🚨 Alert', 'Better, Faster, Cheaper Summaries Amp now uses a different model when compacting or summarizing threads. It''s 4-6x faster, roughly 30x cheaper, and provides better summaries when y...

Another step toward AI-first development.

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:25', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (82, '📱 Platform News', 'Queued Messages You can now queue messages that will only be sent to the agent once it''s idle. To add a message to the queue, hold shift while submitting.

Useful if you''re building AI tools.

Source: https://ampcode.com/news', NULL, 2, '2025-07-21 20:18:25', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (83, '🔍 Discovery', 'Streamable Transport for MCP Amp now uses streamable HTTP transport for MCP servers by default with a fallback to Server-Sent Events. That allows you to connect to your own MCP ser...

Actually pretty solid, not just marketing fluff.

Source: https://ampcode.com/news', NULL, 2, '2025-07-22 17:00:00', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (84, '⚙️ System Update', 'Multiple AGENT.md Files Amp now looks for AGENT.md files in subtrees, parent directories, and ~/.config/AGENT.md. This lets you keep your top-level AGENT.md general and create more...

Who else is experimenting with this?

Source: https://ampcode.com/news', NULL, 2, '2025-07-22 17:00:00', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (85, '🎨 Design News', 'Quick update: Oracle There''s something new in Amp''s toolbox: a tool called oracle. Behind that tool is a read-only subagent powered by one of the most powerful models today: OpenAI''s o3. o3 is s...

Source: https://ampcode.com/news', NULL, 2, '2025-07-22 17:00:00', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (86, '🌐 Network Update', '"Use the oracle to review the last commit''s changes. I want to make sure that the actual logic for when an idle or requires-user-input notification sound plays has not changed."

Just the beginning.

Source: https://ampcode.com/news', NULL, 2, '2025-07-22 17:00:00', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (88, 'Amp Update', 'Amp Tab 30% Faster Response times of Amp Tab, our in-editor completion engine, are now 30% faster, with up to 50% improvements during peak usage. We worked together with Baseten to...

This could change how we approach development.

[Follow-up] Read the full details here: https://ampcode.com/news', NULL, 2, '2025-07-31 15:28:34', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (89, 'New Feature', 'Thread Forking in VS Code Click on Fork to create a new thread containing all messages prior to this point. Forked threads have a backlink to the original thread. You can use it to...

What''s your take on this development?

[Follow-up] More details here: https://ampcode.com/news', NULL, 2, '2025-07-31 15:28:34', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (90, 'Innovation Alert', 'amp dash x The Amp CLI has a new flag: --execute. -x for short. That flag turns on execute mode, which allows for programmatic use of the Amp CLI. The CLI sends the given prompt to...

[Follow-up] Full story: https://ampcode.com/news', NULL, 2, '2025-07-31 15:28:35', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (91, 'Latest Release', 'Here''s what this really means: Towards a new CLI Everything is changing and everything has changed, even in something that''s decades old: the terminal. Mere months ago, running agents in your terminal was consid...

Thoughts?

[Follow-up] Read more: https://ampcode.com/news', NULL, 2, '2025-07-31 15:28:35', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (92, 'Tech News', 'Streamable Transport for MCP Amp now uses streamable HTTP transport for MCP servers by default with a fallback to Server-Sent Events. That allows you to connect to your own MCP ser...

Not everyone will agree with this approach.

[Follow-up] See the full announcement: https://ampcode.com/news', NULL, 2, '2025-07-31 15:28:35', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (93, 'Development Update', 'Multiple AGENT.md Files Amp now looks for AGENT.md files in subtrees, parent directories, and ~/.config/AGENT.md. This lets you keep your top-level AGENT.md general and create more...

We''ll see if this actually delivers on the promise.

[Follow-up] Details here: https://ampcode.com/news', NULL, 2, '2025-07-31 15:28:35', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (94, 'AI Update', 'For those tracking AI developments: Oracle There''s something new in Amp''s toolbox: a tool called oracle. Behind that tool is a read-only subagent powered by one of the most powerful models today: OpenAI''s o3. o3 is s...

[Follow-up] Complete coverage: https://ampcode.com/news', NULL, 2, '2025-07-31 15:28:35', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (95, 'Progress Report', '"Use the oracle to review the last commit''s changes. I want to make sure that the actual logic for when an idle or requires-user-input notification sound plays has not changed."

This shifts the entire conversation.

[Follow-up] Read the announcement: https://ampcode.com/news', NULL, 2, '2025-07-31 15:28:35', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (96, 'Advancement', 'Technical update: Amp Tab 30% Faster Response times of Amp Tab, our in-editor completion engine, are now 30% faster, with up to 50% improvements during peak usage. We worked together with Baseten to...

[Follow-up] Full technical details: https://ampcode.com/news', NULL, 2, '2025-07-31 15:29:10', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (97, 'Enhancement', 'Thread Forking in VS Code Click on Fork to create a new thread containing all messages prior to this point. Forked threads have a backlink to the original thread. You can use it to...

Makes you wonder about the future of software development.

[Follow-up] Learn more: https://ampcode.com/news', NULL, 2, '2025-07-31 15:29:10', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (98, 'Milestone', 'amp dash x The Amp CLI has a new flag: --execute. -x for short. That flag turns on execute mode, which allows for programmatic use of the Amp CLI. The CLI sends the given prompt to...

Straightforward and effective.

[Follow-up] Full story here: https://ampcode.com/news', NULL, 2, '2025-07-31 15:29:10', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (99, 'Product Launch', 'Towards a new CLI Everything is changing and everything has changed, even in something that''s decades old: the terminal. Mere months ago, running agents in your terminal was consid...

This puts them ahead of the competition.

[Follow-up] See why: https://ampcode.com/news', NULL, 2, '2025-07-31 15:29:10', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (100, 'Analytics Update', 'Streamable Transport for MCP Amp now uses streamable HTTP transport for MCP servers by default with a fallback to Server-Sent Events. That allows you to connect to your own MCP ser...

What do you think this means for the industry?

[Follow-up] More context: https://ampcode.com/news', NULL, 2, '2025-07-31 15:29:10', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (101, 'Tools Update', 'Here''s what happened: Multiple AGENT.md Files Amp now looks for AGENT.md files in subtrees, parent directories, and ~/.config/AGENT.md. This lets you keep your top-level AGENT.md general and create more...

[Follow-up] Full breakdown: https://ampcode.com/news', NULL, 2, '2025-07-31 15:29:10', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (102, 'Breaking News', 'Oracle There''s something new in Amp''s toolbox: a tool called oracle. Behind that tool is a read-only subagent powered by one of the most powerful models today: OpenAI''s o3. o3 is s...

Another step toward AI-first development.

[Follow-up] Details: https://ampcode.com/news', NULL, 2, '2025-07-31 15:29:10', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (103, 'Platform News', '"Use the oracle to review the last commit''s changes. I want to make sure that the actual logic for when an idle or requires-user-input notification sound plays has not changed."

Useful if you''re building AI tools.

[Follow-up] Implementation details: https://ampcode.com/news', NULL, 2, '2025-07-31 15:29:10', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (104, 'Discovery', 'Amp Tab 30% Faster Response times of Amp Tab, our in-editor completion engine, are now 30% faster, with up to 50% improvements during peak usage. We worked together with Baseten to...

Actually solid, not just marketing.

[Follow-up] Judge for yourself: https://ampcode.com/news', NULL, 2, '2025-07-31 16:00:02', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (105, 'System Update', 'Thread Forking in VS Code Click on Fork to create a new thread containing all messages prior to this point. Forked threads have a backlink to the original thread. You can use it to...

Who else is experimenting with this approach?

[Follow-up] Learn more: https://ampcode.com/news', NULL, 2, '2025-07-31 16:00:02', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (106, 'Design Update', 'Quick insight: amp dash x The Amp CLI has a new flag: --execute. -x for short. That flag turns on execute mode, which allows for programmatic use of the Amp CLI. The CLI sends the given prompt to...

[Follow-up] Full analysis: https://ampcode.com/news', NULL, 2, '2025-07-31 16:00:02', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (107, 'Network Update', 'Towards a new CLI Everything is changing and everything has changed, even in something that''s decades old: the terminal. Mere months ago, running agents in your terminal was consid...

This is just the beginning.

[Follow-up] What''s next: https://ampcode.com/news', NULL, 2, '2025-07-31 16:00:02', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (108, '🚀 Amp Update', 'Amp Tab 30% Faster Response times of Amp Tab, our in-editor completion engine, are now 30% faster, with up to 50% improvements during peak usage. We worked together with Baseten to...

Pretty cool stuff tbh

Source: https://ampcode.com/news', NULL, 2, '2025-08-04 18:37:16', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (109, '⚡ New Feature', 'BREAKING: Thread Forking in VS Code Click on Fork to create a new thread containing all messages prior to this point. Forked threads have a backlink to the original thread. You can use it to...

Source: https://ampcode.com/news', NULL, 2, '2025-08-04 18:37:16', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (110, '💡 Innovation', 'amp dash x The Amp CLI has a new flag: --execute. -x for short. That flag turns on execute mode, which allows for programmatic use of the Amp CLI. The CLI sends the given prompt to...

Source: https://ampcode.com/news', NULL, 2, '2025-08-04 18:37:16', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (111, '🔥 Latest Release', 'Recent developments indicate: Towards a new CLI Everything is changing and everything has changed, even in something that''s decades old: the terminal. Mere months ago, running agents in your terminal was consid...

Significant implications for the field.

Source: https://ampcode.com/news', NULL, 2, '2025-08-04 18:37:16', 'https://ampcode.com/news');
INSERT INTO posts (id, title, content, image_url, created_by, created_at, source_url) VALUES (112, '✨ Tech News', 'OMG this is huge!! Streamable Transport for MCP Amp now uses streamable HTTP transport for MCP servers by default with a fallback to Server-Sent Events. That allows you to connect to your own MCP ser... 🤯🤯

Source: https://ampcode.com/news', NULL, 2, '2025-08-04 18:37:16', 'https://ampcode.com/news');

