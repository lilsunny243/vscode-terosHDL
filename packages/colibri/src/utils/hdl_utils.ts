// Copyright 2022 
// Carlos Alberto Ruiz Naranjo [carlosruiznaranjo@gmail.com]
// Ismael Perez Rojo [ismaelprojo@gmail.com ]
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

import { HDL_LANG, HDL_EXTENSIONS, OTHER_EXTENSIONS } from "../common/general";
import * as file_utils from './file_utils';

/**
 * Get file language from extension
 * @param extension File extension. E.g: .vhd
 * @returns File language
**/
export function get_lang_from_extension(extension: string): HDL_LANG {
    if (HDL_EXTENSIONS.VHDL.includes(extension) === true) {
        return HDL_LANG.VHDL;
    }
    else if (HDL_EXTENSIONS.VERILOG.includes(extension) === true) {
        return HDL_LANG.VERILOG;
    }
    else if (HDL_EXTENSIONS.SYSTEMVERILOG.includes(extension) === true) {
        return HDL_LANG.SYSTEMVERILOG;
    }
    else if (OTHER_EXTENSIONS.CPP.includes(extension) === true) {
        return HDL_LANG.CPP;
    }
    else {
        return HDL_LANG.NONE;
    }
}

/**
 * Get file language from path
 * @param file_path File path. E.g: /home/user/file.vhd
 * @returns File language
**/
export function get_lang_from_path(file_path: string): HDL_LANG {
    const extension = file_utils.get_file_extension(file_path);
    const lang = get_lang_from_extension(extension);
    return lang;
}

/**
 * Check if file is HDL
 * @param file_path File path. E.g: /home/user/file.vhd
 * @returns True if file is HDL
**/
export function check_if_hdl_file(file_path: string): boolean {
    const lang = get_lang_from_path(file_path);
    let check = false;
    if (lang !== HDL_LANG.NONE && lang !== HDL_LANG.CPP) {
        check = true;
    }
    return check;
}

/**
 * Remove comments from VHDL code
 * @param content VHDL code
 * @returns VHDL code without comments
**/
export function remove_comments_vhdl(content: string): string {
    const l_comment = new RegExp([
        /--.*/
    ].map(x => (typeof x === 'string') ? x : x.source).join(''), 'mg');
    const b_comment = new RegExp([
        /\*[\s\S]*?\*\//
    ].map(x => (typeof x === 'string') ? x : x.source).join(''), 'mg');

    let match = content.match(b_comment);
    if (match != null) {
        for (let i = 0; i < match.length; i++) {
            const element = match[i];
            const newElement = element.replace(/\S/g, ' ');
            content = content.replace(element, newElement);
        }
    }
    match = content.match(l_comment);
    if (match != null) {
        for (let i = 0; i < match.length; i++) {
            const element = match[i];
            const newElement = element.replace(/\S/g, ' ');
            content = content.replace(element, newElement);
        }
    }
    return content;
}

/**
 * Remove comments from Verilog code
 * @param content Verilog code
 * @returns Verilog code without comments
**/
export function remove_comments_verilog(content: string): string {
    const l_comment = new RegExp([
        /\/\/.*/].map(x => (typeof x === 'string') ? x : x.source).join(''), 'mg');
    const b_comment = new RegExp([
        /\/\*[\s\S]*?\*\//].map(x => (typeof x === 'string') ? x : x.source).join(''), 'mg');
    let match = content.match(b_comment);
    if (match != null) {
        for (let i = 0; i < match.length; i++) {
            const element = match[i];
            const newElement = element.replace(/\S/g, ' ');
            content = content.replace(element, newElement);
        }
    }
    match = content.match(l_comment);
    if (match != null) {
        for (let i = 0; i < match.length; i++) {
            const element = match[i];
            const newElement = element.replace(/\S/g, ' ');
            content = content.replace(element, newElement);
        }
    }
    return content;
}

/**
 * Get top level from code
 * @param code HDL code
 * @param lang HDL language
 * @returns Top level name
**/
export function get_toplevel(code: string, lang: HDL_LANG): string {
    let result;
    let regex;
    if (lang === HDL_LANG.VHDL) {
        code = remove_comments_vhdl(code);
        regex = /(entity|package)\s+(?<name>\w+)\s*is\s*/gim;
        result = regex.exec(code);
        if (result !== null && result !== undefined && result.length >= 3) {
            return result[2];
        }
    }
    else {
        //Remove comments
        code = remove_comments_verilog(code);
        regex = /(?<type>module|program|interface|package|primitive|config|property)\s+(?:automatic\s+)?(?<name>\w+)/gm;
        result = regex.exec(code);
        if (result !== null && result !== undefined && result.length >= 3) {
            return result[2];
        }
    }
    return '';
}

// export function get_declaration(code: string, lang: HDL_LANG) {
//     let result;
//     let regex;
//     const declaration = { name: '', type: '' };
//     if (lang === HDL_LANG.VHDL) {
//         code = remove_comments_vhdl(code);
//         regex = /(entity|package)\s+(?<name>\w+)\s*is\s*/gim;
//         result = regex.exec(code);
//         if (result !== null && result !== undefined && result.length >= 3) {
//             declaration.type = result[1].toLocaleLowerCase();
//             declaration.name = result[2];
//         }
//     }
//     else {
//         //Remove comments
//         code = remove_comments_verilog(code);
//         regex = /(?<type>module|program|interface|package|primitive|config|property)\s+(?:automatic\s+)?(?<name>\w+)/gm;
//         result = regex.exec(code);
//         if (result !== null && result !== undefined && result.length >= 3) {
//             declaration.type = 'entity';
//             declaration.name = result[2];
//         }
//     }
//     return declaration;
// }

export function get_toplevel_from_path(filepath: string): string {
    if (file_utils.check_if_file(filepath) === false) {
        return '';
    }
    const lang = get_lang_from_path(filepath);
    if (lang === HDL_LANG.NONE) {
        return '';
    }

    const code = file_utils.read_file_sync(filepath);
    const entity_name = get_toplevel(code, lang);
    return entity_name;
}

// export async function get_declaration_from_path(filepath: string) {
//     if (filepath === undefined) {
//         return '';
//     }
//     if (fs.existsSync(filepath) === false) {
//         return '';
//     }
//     const lang = get_lang_from_path(filepath);
//     if (lang === HDL_LANG.NONE) {
//         return '';
//     }

//     const code = fs.readFileSync(filepath, "utf8");
//     const entity_name = get_declaration(code, lang);

//     if (entity_name === undefined) {
//         return '';
//     }
//     return entity_name;
// }