// Copyright 2022
// Carlos Alberto Ruiz Naranjo [carlosruiznaranjo@gmail.com]
//
// This file is part of colibri2
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
// along with colibri2.  If not, see <https://www.gnu.org/licenses/>.

import { t_file_reduced, t_file, t_action_result, t_logical } from "../common";
import * as file_utils from "../../utils/file_utils";
import * as utils from "../utils/utils";
import { Manager } from "./manager";
import { Dependency_graph } from "../dependency/dependency";

export class File_manager extends Manager<t_file_reduced, undefined, string, string> {
    private files: t_file[] = [];

    async order(python_path: string) {
        // Get compile order from dependency graph
        const dep_manger = new Dependency_graph();
        const dep_result = await dep_manger.get_compile_order(this.files, python_path);
        if (dep_result.successful) {
            this.files = dep_result.file_order;
            return;
        }

        // Order by lib
        const lib_files: t_file[] = [];
        const non_lib_files: t_file[] = [];

        this.files.forEach(element => {
            if (element.logical_name === ""){
                non_lib_files.push(element);
            }
            else{
                lib_files.push(element);
            }
        });
        
        this.files = lib_files.concat(non_lib_files);
    }

    clear() {
        this.files = [];
    }

    clear_automatic_files() {
        const new_files: t_file[] = [];
        this.files.forEach(file => {
            if (file.is_manual === true) {
                new_files.push(file);
            }
        });
        this.files = new_files;
    }

    get(reference_path?: string): t_file[] {
        if (reference_path !== undefined){
            const new_files =  [...this.files];
            for (let i = 0; i < new_files.length; i++) {
                new_files[i].name = file_utils.get_relative_path(new_files[i].name, reference_path);
            }
            return new_files;
        }
        return this.files;  
    }

    get_by_logical_name(): t_logical[] {
        const logical_list: t_logical[] = [];
        this.files.forEach(file_inst => {
            let exist = false;

            // Find logic name exists
            logical_list.every(logical_inst => {
                // Logical name exists
                if (logical_inst.name === file_inst.logical_name) {
                    logical_inst.file_list.push(file_inst);
                    exist = true;
                    return false;
                }
                return true;
            });
            if (exist === false) {
                logical_list.push({ name: file_inst.logical_name, file_list: [file_inst] });
            }
        });
        return logical_list;
    }

    add(file: t_file_reduced): t_action_result {
        const result: t_action_result = {
            result: "",
            successful: true,
            msg: ""
        };
        if (this.check_if_exists(file.name, file.logical_name)) {
            result.successful = false;
            result.msg = "The file is duplicated";
            return result;
        }

        const complete_file: t_file = {
            name: file.name,
            file_type: utils.get_file_type(file.name),
            is_include_file: file.is_include_file,
            include_path: file.include_path,
            logical_name: file.logical_name,
            is_manual: file.is_manual
        };

        this.files.push(complete_file);
        return result;
    }

    delete(name: string, logical_name = ""): t_action_result {
        const result: t_action_result = {
            result: "",
            successful: true,
            msg: ""
        };
        if (this.check_if_exists(name, logical_name) === false) {
            result.successful = false;
            result.msg = "Toplevel path doesn't exist";
            return result;
        }

        const new_files: t_file[] = [];
        this.files.forEach(file => {
            if (file.name !== name || file.logical_name !== logical_name) {
                new_files.push(file);
            }
        });
        this.files = new_files;
        return result;
    }

    delete_by_logical_name(logical_name: string) {
        this.files.forEach(file_inst => {
            if (logical_name === file_inst.logical_name) {
                this.delete(file_inst.name, logical_name);
            }
        });
    }

    add_logical(logical_name: string) {
        const magic_file: t_file_reduced = {
            name: "",
            is_include_file: false,
            include_path: "",
            logical_name: logical_name,
            is_manual: false
        };
        return this.add(magic_file);
    }

    private check_if_exists(name: string, logical_name = ""): boolean {
        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            if (file.name === name && file.logical_name === logical_name) {
                return true;
            }
        }
        return false;
    }
}