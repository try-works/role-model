/*
 * cmd.go
 *
 * Copyright 2018-2021 Bill Zissimopoulos
 */
/*
 * This file is part of golib.
 *
 * It is licensed under the MIT license. The full license text can be found
 * in the License.txt file at the root of this project.
 */

// Package cmd provides (sub-)command functionality for command-line programs.
// This package works closely with the standard library flag package.
package cmd

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// CmdMap encapsulates a (sub-)command map.
type CmdMap struct {
	cmdmap map[string]*Cmd
	cmdlst []string
	mux    sync.Mutex
}

// Cmd encapsulates a (sub-)command.
type Cmd struct {
	// Flag contains the command flag set.
	Flag *flag.FlagSet

	// Main is the function to run when the command is selected.
	Main func(cmd *Cmd, args []string)

	// Use contains the command usage string.
	Use string

	// Desc contains the command description.
	Desc string
}

// Add adds a new command in the command map.
//
// The name parameter is the command name. However if this parameter contains
// a space or newline it is interpreted as described below. Consider:
//
//     NAME ARGUMENTS
//     DESCRIPTION
//
// Then the command name becomes "NAME", the command Use field becomes
// "NAME ARGUMENTS" and the command Desc field becomes "DESCRIPTION".
func (self *CmdMap) Add(name string, main func(*Cmd, []string)) (cmd *Cmd) {
	lines := strings.SplitN(name, "\n", 2)
	use := lines[0]
	desc := ""
	if 2 == len(lines) {
		desc = lines[1]
	}
	parts := strings.SplitN(use, " ", 2)
	parts[0] = strings.Replace(parts[0], ".", " ", -1)
	name = parts[0]
	if i := strings.LastIndex(parts[0], " "); -1 != i {
		name = name[i+1:]
	}
	use = strings.Join(parts, " ")
	cmd = &Cmd{Flag: flag.NewFlagSet(name, flag.ExitOnError), Main: main, Use: use, Desc: desc}
	cmd.Flag.Usage = UsageFunc(cmd)

	self.mux.Lock()
	defer self.mux.Unlock()
	self.cmdmap[name] = cmd
	self.cmdlst = append(self.cmdlst, name)

	return
}

// Get gets a command by name.
func (self *CmdMap) Get(name string) *Cmd {
	self.mux.Lock()
	defer self.mux.Unlock()
	return self.cmdmap[name]
}

// GetNames gets all command names.
func (self *CmdMap) GetNames() []string {
	self.mux.Lock()
	defer self.mux.Unlock()
	cmdlst := make([]string, len(self.cmdlst))
	copy(cmdlst, self.cmdlst)
	return cmdlst
}

// PrintCmds prints help text for all commands to stderr.
func (self *CmdMap) PrintCmds() {
	for _, name := range self.GetNames() {
		cmd := self.Get(name)
		if nil == cmd {
			continue
		}
		fmt.Fprintln(os.Stderr, "  "+name)
		if "" != cmd.Desc {
			fmt.Fprintln(os.Stderr, "    \t"+cmd.Desc)
		}
	}
}

// Run parses the command line and executes the specified (sub-)command.
func (self *CmdMap) Run(flagSet *flag.FlagSet, args []string) {
	if !flagSet.Parsed() {
		flagSet.Parse(args)
	}

	arg := flagSet.Arg(0)
	cmd := self.Get(arg)

	if nil == cmd {
		if "help" == arg {
			args = flagSet.Args()[1:]
			if 0 == len(args) {
				flagSet.Usage()
			} else {
				for _, name := range args {
					cmd := self.Get(name)
					if nil == cmd {
						continue
					}
					cmd.Flag.Usage()
				}
			}
		} else {
			flagSet.Usage()
		}
		os.Exit(2)
	}

	cmd.Main(cmd, flagSet.Args()[1:])
}

// NewCmdMap creates a new command map.
func NewCmdMap() *CmdMap {
	return &CmdMap{
		cmdmap: map[string]*Cmd{},
	}
}

// GetFlag gets the value of the named flag.
func (self *Cmd) GetFlag(name string) interface{} {
	if f := self.Flag.Lookup(name); nil != f {
		if g, ok := f.Value.(flag.Getter); ok {
			return g.Get()
		}
	}
	return nil
}

// DefaultCmdMap is the default command map.
var DefaultCmdMap = NewCmdMap()

// Add adds a new command in the default command map.
//
// The name parameter is the command name. However if this parameter contains
// a space or newline it is interpreted as described below. Consider:
//
//     NAME ARGUMENTS
//     DESCRIPTION
//
// Then the command name becomes "NAME", the command Use field becomes
// "NAME ARGUMENTS" and the command Desc field becomes "DESCRIPTION".
func Add(name string, main func(*Cmd, []string)) *Cmd {
	return DefaultCmdMap.Add(name, main)
}

// PrintCmds prints help text for all commands in the default command map
// to stderr.
func PrintCmds() {
	DefaultCmdMap.PrintCmds()
}

// Run parses the command line and executes the specified (sub-)command
// from the default command map.
func Run() {
	DefaultCmdMap.Run(flag.CommandLine, os.Args[1:])
}

// UsageFunc returns a usage function appropriate for use with flag.FlagSet.
func UsageFunc(args ...interface{}) func() {
	var (
		cmdmap  *CmdMap
		use     string
		flagSet *flag.FlagSet
	)

	if 0 == len(args) {
		cmdmap = DefaultCmdMap
		flagSet = flag.CommandLine
	} else {
		for _, arg := range args {
			switch a := arg.(type) {
			case *Cmd:
				use = a.Use
				flagSet = a.Flag
			case *CmdMap:
				cmdmap = a
			case string:
				use = a
			case *flag.FlagSet:
				flagSet = a
			}
		}
	}

	return func() {
		progname := filepath.Base(os.Args[0])
		cmdCount := 0
		if nil != cmdmap {
			cmdCount = len(cmdmap.GetNames())
		}

		flagCount := 0
		if nil != flagSet {
			flagSet.VisitAll(func(*flag.Flag) {
				flagCount++
			})
		}

		switch {
		case 0 == cmdCount && 0 == flagCount:
			if "" == use {
				fmt.Fprintf(os.Stderr, "usage: %s\n", progname)
			} else {
				fmt.Fprintf(os.Stderr, "usage: %s %s\n", progname, use)
			}
		case 0 != cmdCount && 0 == flagCount:
			if "" == use {
				use = "command args..."
			}
			fmt.Fprintf(os.Stderr, "usage: %s %s\n", progname, use)
			fmt.Fprintln(os.Stderr)
			fmt.Fprintln(os.Stderr, "commands:")
			cmdmap.PrintCmds()
		case 0 == cmdCount && 0 != flagCount:
			if "" == use {
				use = "[-options] args..."
			}
			fmt.Fprintf(os.Stderr, "usage: %s %s\n", progname, use)
			flagSet.PrintDefaults()
		default:
			if "" == use {
				use = "[-options] command args..."
			}
			fmt.Fprintf(os.Stderr, "usage: %s %s\n", progname, use)
			fmt.Fprintln(os.Stderr)
			fmt.Fprintln(os.Stderr, "commands:")
			cmdmap.PrintCmds()
			fmt.Fprintln(os.Stderr)
			fmt.Fprintln(os.Stderr, "options:")
			flagSet.PrintDefaults()
		}
	}
}
