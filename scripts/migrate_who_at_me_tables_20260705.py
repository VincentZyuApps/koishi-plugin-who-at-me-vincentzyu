#!/usr/bin/env python3
"""
✨ koishi-plugin-who-at-me-vincentzyu SQLite 数据表迁移脚本。

这个脚本会把旧表的数据复制到带插件作用域的新表：
  - who_at_me_messages  ->  who_at_me_vincentzyu_messages
  - who_at_me_mentions  ->  who_at_me_vincentzyu_mentions

推荐用法：
  1. 先停止 Koishi，避免迁移时仍有数据写入。
  2. 把本脚本复制到 Koishi 的 data 目录。
  3. 在 data 目录中先 dry run：
       python3 migrate_who_at_me_tables_20260705.py ./koishi.db
  4. 确认行数无误后再真正执行：
       python3 migrate_who_at_me_tables_20260705.py ./koishi.db --apply

脚本默认非破坏式迁移：只复制数据，不删除旧表。
不带 --apply 时只会打印预演计划，不会修改数据库。

⚠️ 这是作者自用迁移脚本，不是通用数据库维护工具。
如果你要在自己的实例中使用，请先完整检阅脚本内容，并提前备份数据库。
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import sqlite3
import sys
from pathlib import Path


MIGRATION_DATE = "20260705"

OLD_MESSAGES = "who_at_me_messages"
OLD_MENTIONS = "who_at_me_mentions"
NEW_MESSAGES = "who_at_me_vincentzyu_messages"
NEW_MENTIONS = "who_at_me_vincentzyu_mentions"

MESSAGE_COLUMNS = ("id", "platform", "messageId", "userId", "content", "timestamp")
MENTION_COLUMNS = ("id", "messageId", "platform", "channelId", "mentionedUserId", "authorUserId")

COLOR_ENABLED = False
RESET = "\033[0m"
BOLD = "\033[1m"
COLORS = {
    "cyan": "\033[36m",
    "green": "\033[32m",
    "red": "\033[31m",
    "yellow": "\033[33m",
}


CREATE_MESSAGES_SQL = f"""
CREATE TABLE IF NOT EXISTS {NEW_MESSAGES} (
  id TEXT,
  platform TEXT,
  messageId TEXT PRIMARY KEY,
  userId TEXT,
  content TEXT,
  timestamp INTEGER
)
"""

CREATE_MENTIONS_SQL = f"""
CREATE TABLE IF NOT EXISTS {NEW_MENTIONS} (
  id TEXT,
  messageId TEXT,
  platform TEXT,
  channelId TEXT,
  mentionedUserId TEXT,
  authorUserId TEXT,
  PRIMARY KEY (messageId, platform, mentionedUserId, authorUserId)
)
"""


def setup_color(mode: str) -> None:
    global COLOR_ENABLED
    if mode == "always":
        COLOR_ENABLED = True
    elif mode == "never" or os.environ.get("NO_COLOR"):
        COLOR_ENABLED = False
    else:
        COLOR_ENABLED = sys.stdout.isatty()


def style(text: object, color: str | None = None, bold: bool = False) -> str:
    value = str(text)
    if not COLOR_ENABLED:
        return value

    parts = []
    if bold:
        parts.append(BOLD)
    if color:
        parts.append(COLORS[color])
    if not parts:
        return value
    return "".join(parts) + value + RESET


def print_title(text: str) -> None:
    print(style(text, "cyan", bold=True))


def print_hint(text: str) -> None:
    print(style(text, "yellow", bold=True))


def print_success(text: str) -> None:
    print(style(text, "green", bold=True))


def print_error(text: str) -> None:
    print(style(text, "red", bold=True), file=sys.stderr)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="✨ 迁移 who-at-me SQLite 表到 who_at_me_vincentzyu_* 新表名。",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=f"""
推荐流程：
  0. 注意：这是作者自用脚本；如果你要使用，请先检阅脚本内容并确认已经备份。
  1. 停止 Koishi。
  2. 把本脚本复制到 Koishi 的 data 目录。
  3. 进入 data 目录后先预演：
       python3 migrate_who_at_me_tables_{MIGRATION_DATE}.py ./koishi.db
  4. 确认输出中的行数无误后执行：
       python3 migrate_who_at_me_tables_{MIGRATION_DATE}.py ./koishi.db --apply

可选：
  --archive-old   迁移成功后把旧表重命名为 *_migrated_{MIGRATION_DATE}
  --no-backup     跳过自动 SQLite 备份（通常不建议）
  --color always  在非交互终端里也强制彩色输出
""",
    )
    parser.add_argument(
        "db",
        type=Path,
        help="Koishi SQLite 数据库路径，例如 ./koishi.db",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="真正执行写入。省略该参数时只进行 dry run 预演。",
    )
    parser.add_argument(
        "--archive-old",
        action="store_true",
        help=f"复制成功后把旧表重命名为 *_migrated_{MIGRATION_DATE}。",
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="执行迁移前不创建自动 SQLite 备份。",
    )
    parser.add_argument(
        "--backup-path",
        type=Path,
        default=None,
        help=f"自定义备份路径。默认：<db>.bak.{MIGRATION_DATE}.<timestamp>",
    )
    parser.add_argument(
        "--color",
        choices=("auto", "always", "never"),
        default="auto",
        help="控制彩色输出：auto 自动、always 强制、never 关闭。默认 auto。",
    )
    return parser.parse_args()


def q(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def connect(db_path: Path, readonly: bool = False) -> sqlite3.Connection:
    if readonly:
        uri = f"file:{db_path.resolve().as_posix()}?mode=ro"
        return sqlite3.connect(uri, uri=True)
    return sqlite3.connect(str(db_path), timeout=30)


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in conn.execute(f"PRAGMA table_info({q(table)})")}


def count_rows(conn: sqlite3.Connection, table: str) -> int:
    if not table_exists(conn, table):
        return 0
    return int(conn.execute(f"SELECT COUNT(*) FROM {q(table)}").fetchone()[0])


def validate_columns(conn: sqlite3.Connection, table: str, required: tuple[str, ...]) -> None:
    if not table_exists(conn, table):
        return
    existing = table_columns(conn, table)
    missing = [column for column in required if column not in existing]
    if missing:
        raise RuntimeError(f"Table {table} is missing columns: {', '.join(missing)}")


def create_backup(db_path: Path, backup_path: Path) -> None:
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    with connect(db_path, readonly=True) as src, sqlite3.connect(str(backup_path)) as dst:
        src.backup(dst)


def default_backup_path(db_path: Path) -> Path:
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    return db_path.with_name(f"{db_path.name}.bak.{MIGRATION_DATE}.{timestamp}")


def insert_missing_rows(
    conn: sqlite3.Connection,
    old_table: str,
    new_table: str,
    columns: tuple[str, ...],
) -> int:
    column_list = ", ".join(q(column) for column in columns)
    before = count_rows(conn, new_table)
    conn.execute(
        f"""
        INSERT OR IGNORE INTO {q(new_table)} ({column_list})
        SELECT {column_list}
        FROM {q(old_table)}
        """
    )
    after = count_rows(conn, new_table)
    return after - before


def archive_table(conn: sqlite3.Connection, table: str) -> str | None:
    archive = f"{table}_migrated_{MIGRATION_DATE}"
    if not table_exists(conn, table):
        return None
    if table_exists(conn, archive):
        raise RuntimeError(f"Archive table already exists: {archive}")
    conn.execute(f"ALTER TABLE {q(table)} RENAME TO {q(archive)}")
    return archive


def format_bool(value: bool) -> str:
    if value:
        return style("是", "green", bold=True)
    return style("否", "red", bold=True)


def format_count(value: int) -> str:
    return style(f"{value:,}", "yellow", bold=True)


def print_usage_hint() -> None:
    script_name = Path(__file__).name
    print_hint("⚠️ 这是作者自用迁移脚本；如果你要使用，请先检阅脚本内容，并提前备份数据库。")
    print_hint("💡 推荐把脚本放到 Koishi 的 data 目录后执行：")
    print(f"   {style('前置:', 'cyan', bold=True)} 先停止 Koishi，避免迁移时仍有新数据写入")
    print(f"   {style('预演:', 'cyan', bold=True)} python3 {script_name} ./koishi.db")
    print(f"   {style('执行:', 'cyan', bold=True)} python3 {script_name} ./koishi.db --apply")
    print(f"   {style('说明:', 'cyan', bold=True)} 默认会自动备份数据库，并保留旧表不删除")
    print()


def print_location_hint(db_path: Path) -> None:
    cwd = Path.cwd().resolve()
    if cwd == db_path.parent:
        return

    print_hint("📁 提醒：当前工作目录不是数据库所在目录。")
    print(f"   {style('当前目录:', 'cyan', bold=True)} {cwd}")
    print(f"   {style('数据库目录:', 'cyan', bold=True)} {db_path.parent}")
    print("   推荐把脚本复制到 Koishi 的 data 目录，并在 data 目录中执行。")
    print()


def print_table_plan(conn: sqlite3.Connection, old_table: str, new_table: str) -> None:
    old_exists = table_exists(conn, old_table)
    new_exists = table_exists(conn, new_table)
    print(f"📦 {style(old_table, 'cyan', bold=True)}  ➜  {style(new_table, 'green', bold=True)}")
    print(f"   旧表存在: {format_bool(old_exists)} | 旧表行数: {format_count(count_rows(conn, old_table))}")
    print(f"   新表存在: {format_bool(new_exists)} | 新表行数: {format_count(count_rows(conn, new_table))}")


def migrate(args: argparse.Namespace) -> int:
    db_path = args.db.expanduser().resolve()
    if not db_path.exists():
        print_error(f"❌ 数据库不存在: {db_path}")
        print()
        print_usage_hint()
        return 2

    with connect(db_path) as conn:
        validate_columns(conn, OLD_MESSAGES, MESSAGE_COLUMNS)
        validate_columns(conn, OLD_MENTIONS, MENTION_COLUMNS)
        validate_columns(conn, NEW_MESSAGES, MESSAGE_COLUMNS)
        validate_columns(conn, NEW_MENTIONS, MENTION_COLUMNS)

        print_title("✨ who-at-me 数据表迁移")
        print(f"📍 数据库: {style(db_path, 'cyan', bold=True)}")
        print()
        print_usage_hint()
        print_location_hint(db_path)
        print_title("🔎 表状态检查")
        print_table_plan(conn, OLD_MESSAGES, NEW_MESSAGES)
        print_table_plan(conn, OLD_MENTIONS, NEW_MENTIONS)

        old_messages_exists = table_exists(conn, OLD_MESSAGES)
        old_mentions_exists = table_exists(conn, OLD_MENTIONS)
        if not old_messages_exists and not old_mentions_exists:
            print()
            print_success("✅ 没有找到旧 who-at-me 表，无需迁移。")
            return 0

        if not args.apply:
            print()
            print_hint("🧪 当前是 dry run 预演，没有修改数据库。")
            print(f"🚀 确认行数无误后执行: {style(f'python3 {Path(__file__).name} ./koishi.db --apply', 'green', bold=True)}")
            return 0

    if not args.no_backup:
        backup_path = (args.backup_path or default_backup_path(db_path)).expanduser().resolve()
        print()
        print_hint(f"🛟 正在创建 SQLite 备份: {backup_path}")
        create_backup(db_path, backup_path)
    else:
        print()
        print_hint("⚠️ 已按 --no-backup 跳过自动备份。")

    with connect(db_path) as conn:
        try:
            print_title("🚚 开始迁移")
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(CREATE_MESSAGES_SQL)
            conn.execute(CREATE_MENTIONS_SQL)

            inserted_messages = 0
            inserted_mentions = 0
            if table_exists(conn, OLD_MESSAGES):
                inserted_messages = insert_missing_rows(conn, OLD_MESSAGES, NEW_MESSAGES, MESSAGE_COLUMNS)
            if table_exists(conn, OLD_MENTIONS):
                inserted_mentions = insert_missing_rows(conn, OLD_MENTIONS, NEW_MENTIONS, MENTION_COLUMNS)

            archived = []
            if args.archive_old:
                for table in (OLD_MESSAGES, OLD_MENTIONS):
                    archive = archive_table(conn, table)
                    if archive:
                        archived.append(archive)

            conn.commit()
        except Exception:
            conn.rollback()
            raise

        print()
        print_success("✅ 迁移完成。")
        print(f"📝 新增消息记录: {format_count(inserted_messages)}")
        print(f"🏷️ 新增 @ 记录: {format_count(inserted_mentions)}")
        print(f"📦 {style(NEW_MESSAGES, 'green', bold=True)} 行数: {format_count(count_rows(conn, NEW_MESSAGES))}")
        print(f"📦 {style(NEW_MENTIONS, 'green', bold=True)} 行数: {format_count(count_rows(conn, NEW_MENTIONS))}")
        if archived:
            print(f"🗄️ 已归档旧表: {style(', '.join(archived), 'yellow', bold=True)}")
        else:
            print_success("🧩 旧表已保留，没有删除或重命名。")

    return 0


def main() -> int:
    try:
        args = parse_args()
        setup_color(args.color)
        return migrate(args)
    except Exception as error:
        print_error(f"❌ 迁移失败: {error}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
