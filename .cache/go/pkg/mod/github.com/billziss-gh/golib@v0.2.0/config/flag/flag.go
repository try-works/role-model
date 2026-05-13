/*
 * flag.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package flag facilitates use of the standard library package flag with
// package config.
package flag

import (
	"flag"

	"github.com/billziss-gh/golib/config"
)

// Visit gets the flags present in a command line as a typed configuration section.
func Visit(flagSet *flag.FlagSet, section config.TypedSection, names ...string) {
	if nil == flagSet {
		flagSet = flag.CommandLine
	}

	if 0 == len(names) {
		flagSet.Visit(func(f *flag.Flag) {
			if g, ok := f.Value.(flag.Getter); ok {
				section[f.Name] = g.Get()
			}
		})
	} else {
		// Use Visit instead of Lookup as we only want flags that were actually set.
		flagSet.Visit(func(f *flag.Flag) {
			for _, n := range names {
				if f.Name == n {
					if g, ok := f.Value.(flag.Getter); ok {
						section[f.Name] = g.Get()
					}
					break
				}
			}
		})
	}
}

// VisitAll gets all flags as a typed configuration section.
func VisitAll(flagSet *flag.FlagSet, section config.TypedSection, names ...string) {
	if nil == flagSet {
		flagSet = flag.CommandLine
	}

	if 0 == len(names) {
		flagSet.VisitAll(func(f *flag.Flag) {
			if g, ok := f.Value.(flag.Getter); ok {
				section[f.Name] = g.Get()
			}
		})
	} else {
		for _, n := range names {
			if f := flagSet.Lookup(n); nil != f {
				if g, ok := f.Value.(flag.Getter); ok {
					section[f.Name] = g.Get()
				}
			}
		}
	}
}
