// Copyright 2020 Teros Technology
//
// Ismael Perez Rojo
// Carlos Alberto Ruiz Naranjo
// Alfredo Saez
//
// This file is part of Colibri.
//
// Colibri is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Colibri is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Colibri.  If not, see <https://www.gnu.org/licenses/>.

import * as vscode from 'vscode';
import * as path_lib from 'path';
import * as fs from 'fs';
import * as teroshdl2 from 'teroshdl2';
import { Multi_project_manager } from 'teroshdl2/out/project_manager/multi_project_manager';
import * as nunjucks from 'nunjucks';
import { Logger } from '../logger';

const base_path = "dependencies_viewer";

// eslint-disable-next-line @typescript-eslint/class-name-casing
export class Dependency_manager {

    private logger: Logger;
    private context: vscode.ExtensionContext;
    protected panel: vscode.WebviewPanel | undefined;
    protected manager: Multi_project_manager;
    private init: boolean = false;
    private viz : any = undefined;
    private dependencies : string = "";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Constructor
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    constructor(context: vscode.ExtensionContext, logger: Logger, manager: Multi_project_manager) {

        const activation_command = 'teroshdl.dependency.viewer';
        const id = "dependency_viewer";

        const resource_path = path_lib.join(context.extensionPath, 'resources', 'webviews', base_path, 'state_machine_viewer.html');
        // super(context, manager, resource_path, activation_command, id);
        this.context = context;
        this.manager = manager;
        this.logger = logger;
    }

    get_webview_content(webview: vscode.Webview) {
        const template_path = path_lib.join(this.context.extensionPath, 'resources', 'webviews', base_path, 'index.html.nj');
        const template_str = fs.readFileSync(template_path, 'utf-8');

        const css_bootstrap_path = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webviews', 'common',
            'bootstrap.min.css'));
        const css_common_path = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webviews', 'common',
            'style.css'));
        const js_path_0 = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webviews',
            base_path, 'libs', 'jquery-2.2.4.min.js'));
        const js_path_1 = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webviews',
            base_path, 'libs', 'svg-pan-zoom.min.js'));
        const js_path_2 = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webviews',
            base_path, 'libs', 'vizdraw.js'));
        const js_path_3 = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webviews',
            base_path, 'libs', 'full.render.js'));
        const js_path_4 = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'webviews',
            base_path, 'libs', 'viz.js'));

        const html = nunjucks.renderString(template_str, {
            'css_bootstrap_path': css_bootstrap_path,
            "css_common_path": css_common_path, 
            "cspSource": webview.cspSource,
            "js_path_0": js_path_0,
            "js_path_1": js_path_1,
            "js_path_2": js_path_2,
            "js_path_3": js_path_3,
            "js_path_4": js_path_4,
        });
        return html;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Webview creator
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    async create_webview() {
        if (this.panel !== undefined) {
            this.update();
            return;
        }
        this.panel = vscode.window.createWebviewPanel(
            'dependency_viewer',
            'Dependency Viewer',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.onDidDispose(
            () => {
                // When the panel is closed, cancel any future updates to the webview content
                this.panel = undefined;
            },
            null,
            this.context.subscriptions
        );
        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'export':
                        this.export_as();
                        return;
                }
            },
            undefined,
            this.context.subscriptions
        );

        this.panel.webview.html = this.get_webview_content(this.panel.webview);

        this.update();
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Update
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    async update() {
        const selected_project = this.manager.get_select_project();
        if (selected_project.successful === false) {
            this.logger.error("Selecte a project first.", false);
            return "";
        }

        const python_path = this.manager.get_config_manager().get_config().general.general.pypath;

        const result = await (<teroshdl2.project_manager.project_manager.Project_manager>selected_project.result)
            .get_dependency_graph(python_path)

        if (result.successful === false) {
            this.logger.error("Error while getting dependency graph.", true);
            this.logger.error(result.msg, true);
            return "";
        }
        this.dependencies = result.result;
        await this.panel?.webview.postMessage({ command: "update", message: result.result });
    }

    async export_as() {
        const svg = await this.get_dependency_graph_svg(this.dependencies);
        const result = await vscode.window.showSaveDialog(
            {
                title: "Select output folder",
                filters: {
                    "SVG": ["svg"]
                },
                saveLabel: "Save"
            });
        if (result !== undefined) {
            fs.writeFileSync(result.fsPath, svg);
            this.logger.info(`Dependency graph image saved in: ${result.fsPath}`, true);
        }
    }

    async get_dependency_graph_svg(dependencies) {
        let element = this;
        try {
            return new Promise(function (resolve) {
                if (element.init === false) {
                    const viz_path = element.context.asAbsolutePath(path_lib.join('resources', 'viz'));
                    const Viz = require(path_lib.join(viz_path, 'viz'));
                    const worker = require(path_lib.join(viz_path, 'full.render'));
                    element.viz = new Viz(worker);
                    element.init = true;
                }
                if (element.viz !== undefined) {
                    element.viz.renderString(dependencies).then(function (string) {
                        resolve(string);
                    });
                }
            });
        } catch (e) {
            console.log(e);
        }
    }
}