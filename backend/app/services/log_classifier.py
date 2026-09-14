"""
DEVSIGHTAI — Log Classification Service

Regex-based classification of log messages into severity levels.
Used by the /api/logs endpoint when the caller doesn't provide a level.
"""

import re

# Priority order matters — check CRITICAL first, then ERROR, then WARN
_CLASSIFICATION_RULES = [
    ("CRITICAL", re.compile(
        r"(critical|fatal|panic|system\s*crash|out\s*of\s*memory|oom|unrecoverable)",
        re.IGNORECASE,
    )),
    ("ERROR", re.compile(
        r"(error|exception|fail(ed|ure)?|timeout|refused|denied|traceback|"
        r"cannot\s+connect|connection\s+(lost|reset|closed)|"
        r"null\s*pointer|segfault|http\s*5\d{2})",
        re.IGNORECASE,
    )),
    ("WARN", re.compile(
        r"(warn(ing)?|deprecated|slow|retry|retrying|"
        r"high\s+(cpu|memory|latency|load)|threshold|"
        r"approaching\s+limit|degraded)",
        re.IGNORECASE,
    )),
]


def classify_log_level(message: str) -> str:
    """
    Classify a log message into CRITICAL, ERROR, WARN, or INFO.

    Scans the message against known patterns in priority order.
    Returns the first match, or 'INFO' if no patterns match.
    """
    for level, pattern in _CLASSIFICATION_RULES:
        if pattern.search(message):
            return level
    return "INFO"
