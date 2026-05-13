///usr/bin/env go run "$0" "$@"; exit
// +build tool

/*
 * getline.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/billziss-gh/golib/terminal/editor"
)

func handler(line string) []string {
	if i := strings.LastIndexByte(line, ' '); -1 != i {
		line = line[i+1:]
	}
	matches, _ := filepath.Glob(line)
	return matches
}

func main() {
	prompt := "line"
	if 2 <= len(os.Args) && "-p" == os.Args[1] {
		prompt = "pass"
	}

	if "line" == prompt {
		editor.DefaultEditor.History().SetCap(100)
		editor.DefaultEditor.SetCompletionHandler(handler)
	}

	fmt.Println("To quit type ^D on Unix and ^Z on Windows.")

	for {
		var l string
		var err error
		if "line" == prompt {
			l, err = editor.DefaultEditor.GetLine(prompt + ": ")
		} else {
			l, err = editor.DefaultEditor.GetPass(prompt + ": ")
		}
		if nil != err {
			fmt.Println(err)
			return
		}

		fmt.Println(prompt + ": " + l)
		editor.DefaultEditor.History().Add(l)
	}
}
