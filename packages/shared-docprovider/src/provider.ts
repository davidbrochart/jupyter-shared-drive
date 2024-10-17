/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { User } from '@jupyterlab/services';
import { TranslationBundle } from '@jupyterlab/translation';

import { PromiseDelegate } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';

import { DocumentChange, YDocument } from '@jupyter/ydoc';

import { Awareness } from 'y-protocols/awareness';
import { WebrtcProvider as YWebrtcProvider } from 'y-webrtc';

/**
 * An interface for a document provider.
 */
export interface IDocumentProvider extends IDisposable {
  /**
   * Returns a Promise that resolves when the document provider is ready.
   */
  readonly ready: Promise<void>;
}

/**
 * A class to provide Yjs synchronization over WebRTC.
 */
export class WebrtcProvider implements IDocumentProvider {
  /**
   * Construct a new WebrtcProvider
   *
   * @param options The instantiation options for a WebrtcProvider
   */
  constructor(options: WebrtcProvider.IOptions) {
    this._isDisposed = false;
    this._path = options.path;
    this._contentType = options.contentType;
    this._format = options.format;
    this._sharedModel = options.model;
    this._awareness = options.model.awareness;
    this._yWebrtcProvider = null;
    this._signalingServers = options.signalingServers;

    const user = options.user;

    user.ready
      .then(() => {
        this._onUserChanged(user);
      })
      .catch(e => console.error(e));
    user.userChanged.connect(this._onUserChanged, this);

    this._connect().catch(e => console.warn(e));
  }

  /**
   * Test whether the object has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A promise that resolves when the document provider is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Dispose of the resources held by the object.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    //this._yWebrtcProvider?.off('status', this._onSync);
    this._yWebrtcProvider?.destroy();
    Signal.clearData(this);
  }

  private async _connect(): Promise<void> {
    this._yWebrtcProvider = new YWebrtcProvider(
      `${this._format}:${this._contentType}:${this._path}}`,
      this._sharedModel.ydoc,
      {
        signaling: this._signalingServers,
        awareness: this._awareness
      }
    );

    this._yWebrtcProvider.on('synced', this._onSync);
  }

  private _onUserChanged(user: User.IManager): void {
    this._awareness.setLocalStateField('user', user.identity);
  }

  private _onSync = (synced: any) => {
    if (synced.synced) {
      this._ready.resolve();
      //this._yWebrtcProvider?.off('status', this._onSync);
    }
  };

  private _awareness: Awareness;
  private _contentType: string;
  private _format: string;
  private _isDisposed: boolean;
  private _path: string;
  private _ready = new PromiseDelegate<void>();
  private _sharedModel: YDocument<DocumentChange>;
  private _yWebrtcProvider: YWebrtcProvider | null;
  private _signalingServers: string[];
}

/**
 * A namespace for WebSocketProvider statics.
 */
export namespace WebrtcProvider {
  /**
   * The instantiation options for a WebSocketProvider.
   */
  export interface IOptions {
    /**
     * The server URL
     */
    url: string;

    /**
     * The document file path
     */
    path: string;

    /**
     * Content type
     */
    contentType: string;

    /**
     * The source format
     */
    format: string;

    /**
     * The shared model
     */
    model: YDocument<DocumentChange>;

    /**
     * The user data
     */
    user: User.IManager;

    /**
     * The jupyterlab translator
     */
    translator: TranslationBundle;

    /**
     * The list of WebRTC signaling servers
     */
    signalingServers: string[];
  }
}
