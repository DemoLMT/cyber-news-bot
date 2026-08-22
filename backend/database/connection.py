from pathlib import Path
from agent.tools.db_manager import initialize_database, get_database_path


def get_connection(config: dict):
    path = get_database_path(config)
    return initialize_database(path)
