/********************************************************************************
 * Copyright (C) 2017 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { ContainerModule, Container } from 'inversify';
import { CommandContribution, MenuContribution } from '@theia/core/lib/common';
import { bindContributionProvider } from '@theia/core';
import { KeybindingContribution, WebSocketConnectionProvider, WidgetFactory, KeybindingContext, QuickOpenContribution } from '@theia/core/lib/browser';
import { TabBarToolbarContribution } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { TerminalFrontendContribution } from './terminal-frontend-contribution';
import { TerminalWidgetImpl, TERMINAL_WIDGET_FACTORY_ID } from './terminal-widget-impl';
import { TerminalWidget, TerminalWidgetOptions } from './base/terminal-widget';
import { ITerminalServer, terminalPath } from '../common/terminal-protocol';
import { TerminalWatcher } from '../common/terminal-watcher';
import { IShellTerminalServer, shellTerminalPath, ShellTerminalServerProxy } from '../common/shell-terminal-protocol';
import { TerminalActiveContext } from './terminal-keybinding-contexts';
import { createCommonBindings } from '../common/terminal-common-module';
import { TerminalService } from './base/terminal-service';
import { bindTerminalPreferences } from './terminal-preferences';
import { URLMatcher, LocalhostMatcher } from './terminal-linkmatcher';
import { TerminalContribution } from './terminal-contribution';
import { TerminalLinkmatcherFiles } from './terminal-linkmatcher-files';
import { TerminalLinkmatcherDiffPre, TerminalLinkmatcherDiffPost } from './terminal-linkmatcher-diff';
import { TerminalQuickOpenService, TerminalQuickOpenContribution } from './terminal-quick-open-service';

import '../../src/browser/terminal.css';
import 'xterm/lib/xterm.css';
import { TerminalCopyOnSelectionHandler } from './terminal-copy-on-selection-handler';

export default new ContainerModule(bind => {
    bindTerminalPreferences(bind);
    bind(KeybindingContext).to(TerminalActiveContext).inSingletonScope();

    bind(TerminalWidget).to(TerminalWidgetImpl).inTransientScope();
    bind(TerminalWatcher).toSelf().inSingletonScope();

    let terminalNum = 0;
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: TERMINAL_WIDGET_FACTORY_ID,
        createWidget: (options: TerminalWidgetOptions) => {
            const child = new Container({ defaultScope: 'Singleton' });
            child.parent = ctx.container;
            const counter = terminalNum++;
            const domId = options.id || 'terminal-' + counter;
            const widgetOptions: TerminalWidgetOptions = {
                title: 'Terminal ' + counter,
                useServerTitle: true,
                destroyTermOnClose: true,
                ...options
            };
            child.bind(TerminalWidgetOptions).toConstantValue(widgetOptions);
            child.bind('terminal-dom-id').toConstantValue(domId);

            return child.get(TerminalWidget);
        }
    }));

    bind(TerminalQuickOpenService).toSelf().inSingletonScope();
    bind(TerminalCopyOnSelectionHandler).toSelf().inSingletonScope();

    bind(TerminalQuickOpenContribution).toSelf().inSingletonScope();
    for (const identifier of [CommandContribution, QuickOpenContribution]) {
        bind(identifier).toService(TerminalQuickOpenContribution);
    }

    bind(TerminalFrontendContribution).toSelf().inSingletonScope();
    bind(TerminalService).toService(TerminalFrontendContribution);
    for (const identifier of [CommandContribution, MenuContribution, KeybindingContribution, TabBarToolbarContribution]) {
        bind(identifier).toService(TerminalFrontendContribution);
    }

    bind(ITerminalServer).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        const terminalWatcher = ctx.container.get(TerminalWatcher);
        return connection.createProxy<ITerminalServer>(terminalPath, terminalWatcher.getTerminalClient());
    }).inSingletonScope();

    bind(ShellTerminalServerProxy).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        const terminalWatcher = ctx.container.get(TerminalWatcher);
        return connection.createProxy<IShellTerminalServer>(shellTerminalPath, terminalWatcher.getTerminalClient());
    }).inSingletonScope();
    bind(IShellTerminalServer).toService(ShellTerminalServerProxy);

    createCommonBindings(bind);

    // link matchers
    bindContributionProvider(bind, TerminalContribution);

    bind(URLMatcher).toSelf().inSingletonScope();
    bind(TerminalContribution).toService(URLMatcher);

    bind(LocalhostMatcher).toSelf().inSingletonScope();
    bind(TerminalContribution).toService(LocalhostMatcher);

    bind(TerminalLinkmatcherFiles).toSelf().inSingletonScope();
    bind(TerminalContribution).toService(TerminalLinkmatcherFiles);

    bind(TerminalLinkmatcherDiffPre).toSelf().inSingletonScope();
    bind(TerminalContribution).toService(TerminalLinkmatcherDiffPre);

    bind(TerminalLinkmatcherDiffPost).toSelf().inSingletonScope();
    bind(TerminalContribution).toService(TerminalLinkmatcherDiffPost);
});
