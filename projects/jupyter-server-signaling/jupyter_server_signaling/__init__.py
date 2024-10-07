# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import importlib.metadata
from typing import Any, Dict, List

from .app import SignalingExtension


try:
    __version__ = importlib.metadata.version("jupyter-server-signaling")
    print(f"{__version__}")
except importlib.metadata.PackageNotFoundError:
    __version__ = "unknown"


def _jupyter_server_extension_points() -> List[Dict[str, Any]]:
    return [{"module": "jupyter_server_signaling", "app": SignalingExtension}]
