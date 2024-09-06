# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.
from __future__ import annotations

from jupyter_server.extension.application import ExtensionApp
from traitlets import Unicode

from .handlers import SignalingWebSocketHandler


class SignalingExtension(ExtensionApp):
    name = "jupyter_server_signaling"
    app_name = "Shared Drive"
    description = """
    Enables discovery of peers connected through WebRTC
    """

    signaling_servers = Unicode(
        "api/shared_drive/signaling",
        config=True,
        help="""A comma-separated list of signaling server URLs to connect to, e.g.
        'api/shared_drive/signaling,ws://127.0.0.1:4444,https://signaling.yjs.dev'.
        If the URL starts with 'ws://', 'wss:/', 'http://' or 'https:/' it is considered to be
        an absolute URL, otherwise it is considered to be relative to the Jupyter server base URL.
        """,
    )

    def initialize_handlers(self):
        signaling_servers = []
        for url in [_url.strip() for _url in self.signaling_servers.split(",")]:
            if url.startswith("/"):
                url = url[1:]
            signaling_servers.append(url)

        page_config = self.serverapp.web_app.settings.setdefault("page_config_data", {})
        page_config.setdefault("signalingServers", signaling_servers)

        for url in signaling_servers:
            if not url.startswith(("ws://", "wss://", "http://", "https://")):
                if not url.startswith("/"):
                    url = f"/{url}"
                print(f"{url=}")
                self.handlers.append((url, SignalingWebSocketHandler))
