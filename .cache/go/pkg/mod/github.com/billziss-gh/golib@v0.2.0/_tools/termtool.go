///usr/bin/env go run "$0" "$@"; exit
// +build tool

/*
 * termtool.go
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

	"github.com/billziss-gh/golib/terminal"
)

func main() {
	fd := os.Stdout.Fd()

	fmt.Printf("IsTerminal=%v\n", terminal.IsTerminal(fd))
	fmt.Printf("IsAnsiTerminal=%v\n", terminal.IsAnsiTerminal(fd))
	fmt.Printf("\n")

	codes := []string{
		"black",
		"red",
		"green",
		"yellow",
		"blue",
		"magenta",
		"cyan",
		"white",
		"bgblack",
		"bgred",
		"bggreen",
		"bgyellow",
		"bgblue",
		"bgmagenta",
		"bgcyan",
		"bgwhite",
	}

	for _, c := range codes {
		fmt.Fprintf(terminal.Stdout, "{{%s}}%-16s{{bold %s}}bold %-16s{{off}}\n", c, c, c, c)
	}
}
