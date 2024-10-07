# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

import importlib.metadata


try:
    __version__ = importlib.metadata.version("jupyter-shared-drive-ui")
except importlib.metadata.PackageNotFoundError:
    __version__ = "unknown"


def _jupyter_labextension_paths():
    return [{"src": "labextension", "dest": "@jupyter/shared-drive-extension"}]
