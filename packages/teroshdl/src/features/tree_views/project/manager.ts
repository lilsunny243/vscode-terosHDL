// Copyright 2022 
// Carlos Alberto Ruiz Naranjo [carlosruiznaranjo@gmail.com]
//
// This file is part of teroshdl
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
// along with teroshdl. If not, see <https://www.gnu.org/licenses/>.

/* eslint-disable @typescript-eslint/class-name-casing */
import * as vscode from "vscode";
import * as element from "./element";
import * as path_lib from "path";
import { Multi_project_manager } from 'teroshdl2/out/project_manager/multi_project_manager';
import * as teroshdl2 from 'teroshdl2';
import * as events from "events";
import * as utils from "../utils";
import {Run_output_manager} from "../run_output";
import {Logger} from "../../../logger";

export class Project_manager {
    private tree : element.ProjectProvider;
    private project_manager : Multi_project_manager;
    private emitter : events.EventEmitter;
    private run_output_manager : Run_output_manager;
    private context : vscode.ExtensionContext;
    private global_logger: Logger;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Constructor
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    constructor(context: vscode.ExtensionContext, manager: Multi_project_manager, emitter : events.EventEmitter,
        run_output_manager: Run_output_manager, global_logger : Logger) {
        this.set_commands();

        this.global_logger = global_logger;
        this.emitter = emitter;
        this.project_manager = manager;
        this.tree = new element.ProjectProvider(manager);
        this.run_output_manager = run_output_manager;

        this.context = context;
        
        context.subscriptions.push(vscode.window.registerTreeDataProvider(element.ProjectProvider.getViewID(), this.tree as element.BaseTreeDataProvider<element.Project>));
        vscode.commands.registerCommand("teroshdl.documentation", () => this.open_doc());
        vscode.commands.registerCommand("teroshdl.view.project.configuration", () => this.config());
        vscode.commands.registerCommand("teroshdl.check_dependencies", () => this.check_dependencies());
    }

    async config() {
        vscode.commands.executeCommand("teroshdl.configuration");
    }

    open_doc(){
        vscode.env.openExternal(vscode.Uri.parse('https://terostechnology.github.io/terosHDLdoc/'));
    }

    set_commands(){
        vscode.commands.registerCommand("teroshdl.view.project.add", (item) => this.add_project(item));
        vscode.commands.registerCommand("teroshdl.view.project.select", (item) => this.select_project(item));
        vscode.commands.registerCommand("teroshdl.view.project.delete", (item) => this.delete_project(item));
        vscode.commands.registerCommand("teroshdl.view.project.rename", (item) => this.rename_project(item));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Project
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    async add_project(item: element.Project){
        const PROJECT_ADD_TYPES = [
            "Empty project", 
            "Load project from JSON EDAM", 
            "Load project from YAML EDAM", 
            "Load project from VUnit run.py",
            "Load an example project"
        ];

        const picker_value = await vscode.window.showQuickPick(PROJECT_ADD_TYPES, {
            placeHolder: "Add/load a project.",
        });

        // Empty project
        if (picker_value === PROJECT_ADD_TYPES[0]) {
            // Create project
            const project_name = await utils.get_from_input_box("Set the project name", "Project name");
            if (project_name !== undefined) {
                this.project_manager.create_project(project_name);
                this.refresh();
            }
        }
        // Load from JSON EDAM
        else if(picker_value === PROJECT_ADD_TYPES[1]){
            const path_list = await utils.get_from_open_dialog("Load project", false, true, true, 
                "Select JSON EDAM files", {'JSON files (*.json, *.JSON)': ['json', 'JSON']});
            path_list.forEach(path => {
                this.create_project_from_json(path);
            });
        }
        // Load from YAML EDAM
        else if(picker_value === PROJECT_ADD_TYPES[2]){
            const path_list = await utils.get_from_open_dialog("Load project", false, true, true, 
                "Select YAML EDAM files", {'YAML files (*.yaml, *.yml)': ['yaml', 'yml']});
            path_list.forEach(path => {
                this.create_project_from_yaml(path);
            });
        }
        // Load from VUnit
        else if(picker_value === PROJECT_ADD_TYPES[3]){
            // Create project
            const project_name = await utils.get_from_input_box("Set the project name", "Project name");
            if (project_name !== undefined) {
                this.project_manager.create_project(project_name);
                await utils.add_sources_from_vunit(this.project_manager, project_name, true);
                this.refresh();
            }
        }
        // Load an example
        else if(picker_value === PROJECT_ADD_TYPES[4]){
            const project_examples_types = ['Documenter examples', 'State machine examples',
                'Xsim', 'GHDL', 'Icarus', 'IceStorm', 'ModelSim',
                'Vivado', 'Yosys', 'VUnit', 'cocotb', 'raptor_counter', 'raptor_counter_vhdl', 
                'raptor_aes_decrypt_fpga', 'raptor_and2_gemini'];
            let picker_value = await vscode.window.showQuickPick(project_examples_types, {
                placeHolder: "Choose an example project.",
            });
            if (picker_value !== undefined) {
                if (picker_value === 'Documenter examples') {
                    picker_value = 'documenter';
                }
                if (picker_value === 'State machine examples') {
                    picker_value = 'state_machine';
                }

                const project_path = path_lib.join(this.context.extensionUri.fsPath, "resources", 
                    "project_manager", "examples", picker_value.toLowerCase(), 'project.yml');
                this.create_project_from_yaml(project_path);
            }
        }
    }
    
    create_project_from_json(prj_path : string){
        this.project_manager.create_project_from_json_edam(prj_path);
        this.refresh();
    }

    create_project_from_yaml(prj_path : string){
        this.project_manager.create_project_from_yaml_edam(prj_path);
        this.refresh();
    }

    select_project(item: element.Project){
        this.project_manager.select_project_current(item.get_project_name());
        this.run_output_manager.clear();
        this.refresh();
    }

    delete_project(item: element.Project){
        this.project_manager.delete_project(item.get_project_name());
        this.refresh();
    }

    async rename_project(item: element.Project){
        const new_project_name = await utils.get_from_input_box("New project name", "Project name");
        if (new_project_name !== undefined) {
            this.project_manager.rename_project(item.get_project_name(), new_project_name);
            this.refresh();
        }
    }

    refresh(){
        this.emitter.emit('refresh');
    }

    refresh_tree(){
        this.tree.refresh();
    }

    get_doc_msg(msg_url: string){
        const doc_msg = `Check the documentation to install it: ${msg_url}`;
        return doc_msg;
    }

    async check_dependencies(){
        const options : teroshdl2.process.python.python_options = {
            path: this.project_manager.get_config_global_config().general.general.pypath
        };

        const intro_info = "-------> ";
        const intro_warning = "----> ";
        const intro_error = "------> ";

        this.global_logger.info('Checking dependencies...', true);
        
        // Check python
        const python_result = await teroshdl2.process.python.get_python_path(options)
        if (python_result.successful === false){
            const doc_msg_link = "https://terostechnology.github.io/terosHDLdoc/docs/getting_started/installation#2-python3"
            const doc_msg = this.get_doc_msg(doc_msg_link);

            this.global_logger.error(`${intro_error}Python not found. If you are using system path try setting the complete Python path. ${doc_msg}`);
        }
        else{
            this.global_logger.info(`${intro_info} Python found: ${python_result.python_path}`);
            this.global_logger.info(`${intro_info} Python found in path: ${python_result.python_complete_path}`);

            const package_list = ["vunit", "cocotb", "edalize"];
            const package_list_optional = ["cocotb"];

            for (const package_name of package_list) {
                let optional_msg = "";
                                
                const package_result = await teroshdl2.process.python.check_python_package(python_result.python_path,
                    package_name);
                if (!package_result){
                    const doc_msg_link = "https://terostechnology.github.io/terosHDLdoc/docs/getting_started/installation#3-python3-package-dependencies"
                    const doc_msg = this.get_doc_msg(doc_msg_link);

                    if (package_list_optional.includes(package_name)){
                        this.global_logger.warn(`${intro_warning} ${package_name} (optional installation) not found. ${doc_msg}`);
                    }
                    else{
                        this.global_logger.error(`${intro_error} ${package_name} ${optional_msg} not found. ${doc_msg}`);

                    }
                }
                else{
                    this.global_logger.info(`${intro_info} ${package_name} found ${optional_msg}`);
                }
            }
        }

        // Check make
        const make_binary_dir = this.project_manager.get_config_global_config().general.general.makepath;
        let make_binary_path = ("make");
        if (make_binary_dir !== ""){
            make_binary_path = path_lib.join(make_binary_dir, make_binary_path);
        }

        const proc = new teroshdl2.process.process.Process();
        const make_result = await proc.exec_wait(`${make_binary_path} --version`);
        if (!make_result.successful){
            const doc_msg_link = "https://terostechnology.github.io/terosHDLdoc/docs/getting_started/installation#4-make"
            const doc_msg = this.get_doc_msg(doc_msg_link);
            this.global_logger.error(`${intro_error}Make not found in path: ${make_binary_path}. Check that the path is correct. ${doc_msg}`);
            this.global_logger.error(make_result.stderr);
            this.global_logger.error(make_result.stdout);
        }
        else{
            this.global_logger.info(`${intro_info} Make found in path: ${make_binary_path}.`);
        }
    }
}

