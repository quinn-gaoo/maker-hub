from __future__ import annotations

import logging


LOG_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"


def configure_logging() -> None:
    root_logger = logging.getLogger()
    if root_logger.handlers:
        root_logger.setLevel(logging.INFO)
        for handler in root_logger.handlers:
            handler.setFormatter(logging.Formatter(LOG_FORMAT))
        return

    logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
