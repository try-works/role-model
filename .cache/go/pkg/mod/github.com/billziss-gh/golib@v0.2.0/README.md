# golib - Library of Go packages

[//]: # (GODOC)
* [appdata](#github.com/billziss-gh/golib/appdata) - Package appdata provides access to well known directories for applications.
* [cache](#github.com/billziss-gh/golib/cache) - Package cache provides LRU cache map functionality.
* [cmd](#github.com/billziss-gh/golib/cmd) - Package cmd provides (sub-)command functionality for command-line programs.
* [config](#github.com/billziss-gh/golib/config) - Package config is used to read and write configuration files.
  * [flag](#github.com/billziss-gh/golib/config/flag) - Package flag facilitates use of the standard library package flag with package config.
* [errors](#github.com/billziss-gh/golib/errors) - Package errors implements functions for advanced error handling.
* [keyring](#github.com/billziss-gh/golib/keyring) - Package keyring implements functions for accessing and storing passwords in the system's keyring (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux).
* [retry](#github.com/billziss-gh/golib/retry) - Package retry implements simple retry functionality.
* [shlex](#github.com/billziss-gh/golib/shlex) - Package shlex is used for simple command line splitting.
* [terminal](#github.com/billziss-gh/golib/terminal) - Package terminal provides functionality for terminals.
  * [editor](#github.com/billziss-gh/golib/terminal/editor) - Package editor provides simple readline functionality for Go programs.
* [trace](#github.com/billziss-gh/golib/trace) - Package trace provides a simple tracing facility for Go functions.
* [util](#github.com/billziss-gh/golib/util) - Package util contains general utility functions.



----
## <a name="github.com/billziss-gh/golib/appdata">Package appdata</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/appdata)]_

`import "github.com/billziss-gh/golib/appdata"`

* [Overview](#github.com/billziss-gh/golib/appdata/pkg-overview)
* [Index](#github.com/billziss-gh/golib/appdata/pkg-index)

### <a name="github.com/billziss-gh/golib/appdata/pkg-overview">Overview</a>
Package appdata provides access to well known directories for applications.




### <a name="github.com/billziss-gh/golib/appdata/pkg-index">Index</a>
* [Constants](#github.com/billziss-gh/golib/appdata/pkg-constants)
* [func CacheDir() (string, error)](#github.com/billziss-gh/golib/appdata/CacheDir)
* [func ConfigDir() (string, error)](#github.com/billziss-gh/golib/appdata/ConfigDir)
* [func DataDir() (string, error)](#github.com/billziss-gh/golib/appdata/DataDir)
* [type AppData](#github.com/billziss-gh/golib/appdata/AppData)


##### <a name="github.com/billziss-gh/golib/appdata/pkg-files">Package files</a>
[appdata.go](appdata/appdata.go) [appdata_windows.go](appdata/appdata_windows.go) 


### <a name="github.com/billziss-gh/golib/appdata/pkg-constants">Constants</a>
``` go
const ErrAppData = "ErrAppData"
```



### <a name="github.com/billziss-gh/golib/appdata/CacheDir">func</a> [CacheDir](appdata/appdata.go#L42)
``` go
func CacheDir() (string, error)
```
CacheDir returns the directory where application cache files
should be stored.



### <a name="github.com/billziss-gh/golib/appdata/ConfigDir">func</a> [ConfigDir](appdata/appdata.go#L30)
``` go
func ConfigDir() (string, error)
```
ConfigDir returns the directory where application configuration files
should be stored.



### <a name="github.com/billziss-gh/golib/appdata/DataDir">func</a> [DataDir](appdata/appdata.go#L36)
``` go
func DataDir() (string, error)
```
DataDir returns the directory where application data files
should be stored.




### <a name="github.com/billziss-gh/golib/appdata/AppData">type</a> [AppData](appdata/appdata.go#L20)
``` go
type AppData interface {
    ConfigDir() (string, error)
    DataDir() (string, error)
    CacheDir() (string, error)
}
```

``` go
var DefaultAppData AppData
```
















----
## <a name="github.com/billziss-gh/golib/cache">Package cache</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/cache)]_

`import "github.com/billziss-gh/golib/cache"`

* [Overview](#github.com/billziss-gh/golib/cache/pkg-overview)
* [Index](#github.com/billziss-gh/golib/cache/pkg-index)

### <a name="github.com/billziss-gh/golib/cache/pkg-overview">Overview</a>
Package cache provides LRU cache map functionality.




### <a name="github.com/billziss-gh/golib/cache/pkg-index">Index</a>
* [type Map](#github.com/billziss-gh/golib/cache/Map)
  * [func NewMap(list *MapItem) *Map](#github.com/billziss-gh/golib/cache/NewMap)
  * [func (cmap *Map) Delete(key string)](#github.com/billziss-gh/golib/cache/Map.Delete)
  * [func (cmap *Map) Expire(fn func(list, item *MapItem) bool)](#github.com/billziss-gh/golib/cache/Map.Expire)
  * [func (cmap *Map) Get(key string) (*MapItem, bool)](#github.com/billziss-gh/golib/cache/Map.Get)
  * [func (cmap *Map) InitMap(list *MapItem)](#github.com/billziss-gh/golib/cache/Map.InitMap)
  * [func (cmap *Map) Items() map[string]*MapItem](#github.com/billziss-gh/golib/cache/Map.Items)
  * [func (cmap *Map) Set(key string, newitem *MapItem, expirable bool)](#github.com/billziss-gh/golib/cache/Map.Set)
* [type MapItem](#github.com/billziss-gh/golib/cache/MapItem)
  * [func (item *MapItem) Empty()](#github.com/billziss-gh/golib/cache/MapItem.Empty)
  * [func (list *MapItem) Expire(fn func(list, item *MapItem) bool)](#github.com/billziss-gh/golib/cache/MapItem.Expire)
  * [func (item *MapItem) InsertHead(list *MapItem)](#github.com/billziss-gh/golib/cache/MapItem.InsertHead)
  * [func (item *MapItem) InsertTail(list *MapItem)](#github.com/billziss-gh/golib/cache/MapItem.InsertTail)
  * [func (item *MapItem) IsEmpty() bool](#github.com/billziss-gh/golib/cache/MapItem.IsEmpty)
  * [func (list *MapItem) Iterate(fn func(list, item *MapItem) bool)](#github.com/billziss-gh/golib/cache/MapItem.Iterate)
  * [func (item *MapItem) Remove()](#github.com/billziss-gh/golib/cache/MapItem.Remove)


##### <a name="github.com/billziss-gh/golib/cache/pkg-files">Package files</a>
[map.go](cache/map.go) 






### <a name="github.com/billziss-gh/golib/cache/Map">type</a> [Map](cache/map.go#L93)
``` go
type Map struct {
    // contains filtered or unexported fields
}

```
Map is a map of key/value pairs that also maintains its items
in an LRU (Least Recently Used) list. LRU items may then be expired.







#### <a name="github.com/billziss-gh/golib/cache/NewMap">func</a> [NewMap](cache/map.go#L174)
``` go
func NewMap(list *MapItem) *Map
```
NewMap creates a new cache map.

The cache map tracks items in the LRU list specified by the list
parameter. If the list parameter is nil then items are tracked in
an internal list.





#### <a name="github.com/billziss-gh/golib/cache/Map.Delete">func</a> (\*Map) [Delete](cache/map.go#L139)
``` go
func (cmap *Map) Delete(key string)
```
Delete deletes an item by key.




#### <a name="github.com/billziss-gh/golib/cache/Map.Expire">func</a> (\*Map) [Expire](cache/map.go#L150)
``` go
func (cmap *Map) Expire(fn func(list, item *MapItem) bool)
```
Expire performs list item expiration using a helper function.

See MapItem.Expire for a full discussion.




#### <a name="github.com/billziss-gh/golib/cache/Map.Get">func</a> (\*Map) [Get](cache/map.go#L109)
``` go
func (cmap *Map) Get(key string) (*MapItem, bool)
```
Get gets an item by key.

Get "touches" the item to show that it was recently used. For this
reason Get modifies the internal structure of the cache map and is
not safe to be called under a read lock.




#### <a name="github.com/billziss-gh/golib/cache/Map.InitMap">func</a> (\*Map) [InitMap](cache/map.go#L159)
``` go
func (cmap *Map) InitMap(list *MapItem)
```
InitMap initializes a zero cache map.

The cache map tracks items in the LRU list specified by the list
parameter. If the list parameter is nil then items are tracked in
an internal list.




#### <a name="github.com/billziss-gh/golib/cache/Map.Items">func</a> (\*Map) [Items](cache/map.go#L100)
``` go
func (cmap *Map) Items() map[string]*MapItem
```
Items returns the internal map of the cache map.




#### <a name="github.com/billziss-gh/golib/cache/Map.Set">func</a> (\*Map) [Set](cache/map.go#L125)
``` go
func (cmap *Map) Set(key string, newitem *MapItem, expirable bool)
```
Set sets an item by key.

Whether the new item can be expired is controlled by the expirable parameter.
Expirable items are tracked in an LRU list.




### <a name="github.com/billziss-gh/golib/cache/MapItem">type</a> [MapItem](cache/map.go#L17)
``` go
type MapItem struct {
    Value interface{}
    // contains filtered or unexported fields
}

```
MapItem is the data structure that is stored in a Map.










#### <a name="github.com/billziss-gh/golib/cache/MapItem.Empty">func</a> (\*MapItem) [Empty](cache/map.go#L23)
``` go
func (item *MapItem) Empty()
```
Empty initializes the list item as empty.




#### <a name="github.com/billziss-gh/golib/cache/MapItem.Expire">func</a> (\*MapItem) [Expire](cache/map.go#L86)
``` go
func (list *MapItem) Expire(fn func(list, item *MapItem) bool)
```
Expire performs list item expiration using a helper function.

Expire iterates over the list and calls the helper function fn()
on every list item. The function fn() must perform an expiration
test on the list item and perform one of the following:

- If the list item is not expired, fn() must return false. Expire
will then stop the loop iteration.

- If the list item is expired, fn() has two options. It may remove
the item by using item.Remove() (item eviction). Or it may remove
the item by using item.Remove() and reinsert the item at the list
tail using item.InsertTail(list) (item refresh). In this second case
care must be taken to ensure that fn() returns false for some item
in the list; otherwise the Expire iteration will continue forever,
because the list will never be found empty.




#### <a name="github.com/billziss-gh/golib/cache/MapItem.InsertHead">func</a> (\*MapItem) [InsertHead](cache/map.go#L34)
``` go
func (item *MapItem) InsertHead(list *MapItem)
```
InsertHead inserts the list item to the head of a list.




#### <a name="github.com/billziss-gh/golib/cache/MapItem.InsertTail">func</a> (\*MapItem) [InsertTail](cache/map.go#L43)
``` go
func (item *MapItem) InsertTail(list *MapItem)
```
InsertTail inserts the list item to the tail of a list.




#### <a name="github.com/billziss-gh/golib/cache/MapItem.IsEmpty">func</a> (\*MapItem) [IsEmpty](cache/map.go#L29)
``` go
func (item *MapItem) IsEmpty() bool
```
IsEmpty determines if the list item is empty.




#### <a name="github.com/billziss-gh/golib/cache/MapItem.Iterate">func</a> (\*MapItem) [Iterate](cache/map.go#L65)
``` go
func (list *MapItem) Iterate(fn func(list, item *MapItem) bool)
```
Iterate iterates over the list using a helper function.

Iterate iterates over the list and calls the helper function fn()
on every list item. The function fn() must not modify the list in
any way. The function fn() must return true to continue the iteration
and false to stop it.




#### <a name="github.com/billziss-gh/golib/cache/MapItem.Remove">func</a> (\*MapItem) [Remove](cache/map.go#L52)
``` go
func (item *MapItem) Remove()
```
Remove removes the list item from any list it is in.











----
## <a name="github.com/billziss-gh/golib/cmd">Package cmd</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/cmd)]_

`import "github.com/billziss-gh/golib/cmd"`

* [Overview](#github.com/billziss-gh/golib/cmd/pkg-overview)
* [Index](#github.com/billziss-gh/golib/cmd/pkg-index)

### <a name="github.com/billziss-gh/golib/cmd/pkg-overview">Overview</a>
Package cmd provides (sub-)command functionality for command-line programs.
This package works closely with the standard library flag package.




### <a name="github.com/billziss-gh/golib/cmd/pkg-index">Index</a>
* [Variables](#github.com/billziss-gh/golib/cmd/pkg-variables)
* [func PrintCmds()](#github.com/billziss-gh/golib/cmd/PrintCmds)
* [func Run()](#github.com/billziss-gh/golib/cmd/Run)
* [func UsageFunc(args ...interface{}) func()](#github.com/billziss-gh/golib/cmd/UsageFunc)
* [type Cmd](#github.com/billziss-gh/golib/cmd/Cmd)
  * [func Add(name string, main func(*Cmd, []string)) *Cmd](#github.com/billziss-gh/golib/cmd/Add)
  * [func (self *Cmd) GetFlag(name string) interface{}](#github.com/billziss-gh/golib/cmd/Cmd.GetFlag)
* [type CmdMap](#github.com/billziss-gh/golib/cmd/CmdMap)
  * [func NewCmdMap() *CmdMap](#github.com/billziss-gh/golib/cmd/NewCmdMap)
  * [func (self *CmdMap) Add(name string, main func(*Cmd, []string)) (cmd *Cmd)](#github.com/billziss-gh/golib/cmd/CmdMap.Add)
  * [func (self *CmdMap) Get(name string) *Cmd](#github.com/billziss-gh/golib/cmd/CmdMap.Get)
  * [func (self *CmdMap) GetNames() []string](#github.com/billziss-gh/golib/cmd/CmdMap.GetNames)
  * [func (self *CmdMap) PrintCmds()](#github.com/billziss-gh/golib/cmd/CmdMap.PrintCmds)
  * [func (self *CmdMap) Run(flagSet *flag.FlagSet, args []string)](#github.com/billziss-gh/golib/cmd/CmdMap.Run)


##### <a name="github.com/billziss-gh/golib/cmd/pkg-files">Package files</a>
[cmd.go](cmd/cmd.go) 



### <a name="github.com/billziss-gh/golib/cmd/pkg-variables">Variables</a>
``` go
var DefaultCmdMap = NewCmdMap()
```
DefaultCmdMap is the default command map.



### <a name="github.com/billziss-gh/golib/cmd/PrintCmds">func</a> [PrintCmds](cmd/cmd.go#L181)
``` go
func PrintCmds()
```
PrintCmds prints help text for all commands in the default command map
to stderr.



### <a name="github.com/billziss-gh/golib/cmd/Run">func</a> [Run](cmd/cmd.go#L187)
``` go
func Run()
```
Run parses the command line and executes the specified (sub-)command
from the default command map.



### <a name="github.com/billziss-gh/golib/cmd/UsageFunc">func</a> [UsageFunc](cmd/cmd.go#L192)
``` go
func UsageFunc(args ...interface{}) func()
```
UsageFunc returns a usage function appropriate for use with flag.FlagSet.




### <a name="github.com/billziss-gh/golib/cmd/Cmd">type</a> [Cmd](cmd/cmd.go#L34)
``` go
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

```
Cmd encapsulates a (sub-)command.







#### <a name="github.com/billziss-gh/golib/cmd/Add">func</a> [Add](cmd/cmd.go#L175)
``` go
func Add(name string, main func(*Cmd, []string)) *Cmd
```
Add adds a new command in the default command map.

The name parameter is the command name. However if this parameter contains
a space or newline it is interpreted as described below. Consider:


	NAME ARGUMENTS
	DESCRIPTION

Then the command name becomes "NAME", the command Use field becomes
"NAME ARGUMENTS" and the command Desc field becomes "DESCRIPTION".





#### <a name="github.com/billziss-gh/golib/cmd/Cmd.GetFlag">func</a> (\*Cmd) [GetFlag](cmd/cmd.go#L153)
``` go
func (self *Cmd) GetFlag(name string) interface{}
```
GetFlag gets the value of the named flag.




### <a name="github.com/billziss-gh/golib/cmd/CmdMap">type</a> [CmdMap](cmd/cmd.go#L27)
``` go
type CmdMap struct {
    // contains filtered or unexported fields
}

```
CmdMap encapsulates a (sub-)command map.







#### <a name="github.com/billziss-gh/golib/cmd/NewCmdMap">func</a> [NewCmdMap](cmd/cmd.go#L146)
``` go
func NewCmdMap() *CmdMap
```
NewCmdMap creates a new command map.





#### <a name="github.com/billziss-gh/golib/cmd/CmdMap.Add">func</a> (\*CmdMap) [Add](cmd/cmd.go#L58)
``` go
func (self *CmdMap) Add(name string, main func(*Cmd, []string)) (cmd *Cmd)
```
Add adds a new command in the command map.

The name parameter is the command name. However if this parameter contains
a space or newline it is interpreted as described below. Consider:


	NAME ARGUMENTS
	DESCRIPTION

Then the command name becomes "NAME", the command Use field becomes
"NAME ARGUMENTS" and the command Desc field becomes "DESCRIPTION".




#### <a name="github.com/billziss-gh/golib/cmd/CmdMap.Get">func</a> (\*CmdMap) [Get](cmd/cmd.go#L84)
``` go
func (self *CmdMap) Get(name string) *Cmd
```
Get gets a command by name.




#### <a name="github.com/billziss-gh/golib/cmd/CmdMap.GetNames">func</a> (\*CmdMap) [GetNames](cmd/cmd.go#L91)
``` go
func (self *CmdMap) GetNames() []string
```
GetNames gets all command names.




#### <a name="github.com/billziss-gh/golib/cmd/CmdMap.PrintCmds">func</a> (\*CmdMap) [PrintCmds](cmd/cmd.go#L100)
``` go
func (self *CmdMap) PrintCmds()
```
PrintCmds prints help text for all commands to stderr.




#### <a name="github.com/billziss-gh/golib/cmd/CmdMap.Run">func</a> (\*CmdMap) [Run](cmd/cmd.go#L114)
``` go
func (self *CmdMap) Run(flagSet *flag.FlagSet, args []string)
```
Run parses the command line and executes the specified (sub-)command.











----
## <a name="github.com/billziss-gh/golib/config">Package config</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/config)]_

`import "github.com/billziss-gh/golib/config"`

* [Overview](#github.com/billziss-gh/golib/config/pkg-overview)
* [Index](#github.com/billziss-gh/golib/config/pkg-index)

### <a name="github.com/billziss-gh/golib/config/pkg-overview">Overview</a>
Package config is used to read and write configuration files.

Configuration files are similar to Windows INI files. They store a list
of properties (key/value pairs); they may also be grouped into sections.

The basic syntax of a configuration file is as follows:


	name1=value1
	name2=value2
	...
	
	[section]
	name3=value3
	name4=value4
	...

Properties not in a section are placed in the unnamed (empty "") section.




### <a name="github.com/billziss-gh/golib/config/pkg-index">Index</a>
* [Variables](#github.com/billziss-gh/golib/config/pkg-variables)
* [func ReadFunc(reader io.Reader, fn func(sect, name string, valu interface{})) error](#github.com/billziss-gh/golib/config/ReadFunc)
* [func Write(writer io.Writer, conf Config) error](#github.com/billziss-gh/golib/config/Write)
* [func WriteTyped(writer io.Writer, conf TypedConfig) error](#github.com/billziss-gh/golib/config/WriteTyped)
* [type Config](#github.com/billziss-gh/golib/config/Config)
  * [func Read(reader io.Reader) (Config, error)](#github.com/billziss-gh/golib/config/Read)
  * [func (conf Config) Delete(k string)](#github.com/billziss-gh/golib/config/Config.Delete)
  * [func (conf Config) Get(k string) string](#github.com/billziss-gh/golib/config/Config.Get)
  * [func (conf Config) Set(k string, v string)](#github.com/billziss-gh/golib/config/Config.Set)
* [type Dialect](#github.com/billziss-gh/golib/config/Dialect)
  * [func (dialect *Dialect) Read(reader io.Reader) (Config, error)](#github.com/billziss-gh/golib/config/Dialect.Read)
  * [func (dialect *Dialect) ReadFunc(reader io.Reader, fn func(sect, name string, valu interface{})) error](#github.com/billziss-gh/golib/config/Dialect.ReadFunc)
  * [func (dialect *Dialect) ReadTyped(reader io.Reader) (TypedConfig, error)](#github.com/billziss-gh/golib/config/Dialect.ReadTyped)
  * [func (dialect *Dialect) Write(writer io.Writer, conf Config) error](#github.com/billziss-gh/golib/config/Dialect.Write)
  * [func (dialect *Dialect) WriteTyped(writer io.Writer, conf TypedConfig) error](#github.com/billziss-gh/golib/config/Dialect.WriteTyped)
* [type Section](#github.com/billziss-gh/golib/config/Section)
* [type TypedConfig](#github.com/billziss-gh/golib/config/TypedConfig)
  * [func ReadTyped(reader io.Reader) (TypedConfig, error)](#github.com/billziss-gh/golib/config/ReadTyped)
  * [func (conf TypedConfig) Delete(k string)](#github.com/billziss-gh/golib/config/TypedConfig.Delete)
  * [func (conf TypedConfig) Get(k string) interface{}](#github.com/billziss-gh/golib/config/TypedConfig.Get)
  * [func (conf TypedConfig) Set(k string, v interface{})](#github.com/billziss-gh/golib/config/TypedConfig.Set)
* [type TypedSection](#github.com/billziss-gh/golib/config/TypedSection)


##### <a name="github.com/billziss-gh/golib/config/pkg-files">Package files</a>
[config.go](config/config.go) 



### <a name="github.com/billziss-gh/golib/config/pkg-variables">Variables</a>
``` go
var DefaultDialect = &Dialect{
    AssignChars:    "=:",
    CommentChars:   ";#",
    ReadEmptyKeys:  true,
    WriteEmptyKeys: false,
    Strict:         false,
}
```
DefaultDialect contains the default configuration dialect.
It is compatible with Windows INI files.



### <a name="github.com/billziss-gh/golib/config/ReadFunc">func</a> [ReadFunc](config/config.go#L522)
``` go
func ReadFunc(
    reader io.Reader, fn func(sect, name string, valu interface{})) error
```


### <a name="github.com/billziss-gh/golib/config/Write">func</a> [Write](config/config.go#L541)
``` go
func Write(writer io.Writer, conf Config) error
```
Write writes a configuration to the supplied writer
using the default dialect.



### <a name="github.com/billziss-gh/golib/config/WriteTyped">func</a> [WriteTyped](config/config.go#L547)
``` go
func WriteTyped(writer io.Writer, conf TypedConfig) error
```
WriteTyped writes a typed configuration to the supplied writer
using the default dialect.




### <a name="github.com/billziss-gh/golib/config/Config">type</a> [Config](config/config.go#L52)
``` go
type Config map[string]Section
```
Config is used to store a configuration as string properties.

When using Get, Set, Delete to manipulate properties the property names
follow the syntax SECTION.PROPNAME







#### <a name="github.com/billziss-gh/golib/config/Read">func</a> [Read](config/config.go#L529)
``` go
func Read(reader io.Reader) (Config, error)
```
Read reads a configuration from the supplied reader
using the default dialect.





#### <a name="github.com/billziss-gh/golib/config/Config.Delete">func</a> (Config) [Delete](config/config.go#L94)
``` go
func (conf Config) Delete(k string)
```
Delete deletes a property from the configuration.




#### <a name="github.com/billziss-gh/golib/config/Config.Get">func</a> (Config) [Get](config/config.go#L65)
``` go
func (conf Config) Get(k string) string
```
Get gets a property from the configuration.




#### <a name="github.com/billziss-gh/golib/config/Config.Set">func</a> (Config) [Set](config/config.go#L79)
``` go
func (conf Config) Set(k string, v string)
```
Set sets a property in the configuration.




### <a name="github.com/billziss-gh/golib/config/Dialect">type</a> [Dialect](config/config.go#L157)
``` go
type Dialect struct {
    // AssignChars contains the characters used for property assignment.
    // The first character in AssignChars is the character used during
    // writing.
    AssignChars string

    // CommentChars contains the characters used for comments.
    CommentChars string

    // ReadEmptyKeys determines whether to read properties with missing values.
    // The properties so created will be interpretted as empty strings for Read
    // and boolean true for ReadTyped.
    ReadEmptyKeys bool

    // WriteEmptyKeys determines whether to write properties with missing values.
    // This is only important when writing boolean true properties with
    // WriteTyped; these will be written with missing values.
    WriteEmptyKeys bool

    // Strict determines whether parse errors should be reported.
    Strict bool
}

```
Dialect is used to represent different dialects of configuration files.










#### <a name="github.com/billziss-gh/golib/config/Dialect.Read">func</a> (\*Dialect) [Read](config/config.go#L267)
``` go
func (dialect *Dialect) Read(reader io.Reader) (Config, error)
```
Read reads a configuration from the supplied reader.




#### <a name="github.com/billziss-gh/golib/config/Dialect.ReadFunc">func</a> (\*Dialect) [ReadFunc](config/config.go#L190)
``` go
func (dialect *Dialect) ReadFunc(
    reader io.Reader, fn func(sect, name string, valu interface{})) error
```



#### <a name="github.com/billziss-gh/golib/config/Dialect.ReadTyped">func</a> (\*Dialect) [ReadTyped](config/config.go#L291)
``` go
func (dialect *Dialect) ReadTyped(reader io.Reader) (TypedConfig, error)
```
ReadTyped reads a typed configuration from the supplied reader.




#### <a name="github.com/billziss-gh/golib/config/Dialect.Write">func</a> (\*Dialect) [Write](config/config.go#L337)
``` go
func (dialect *Dialect) Write(writer io.Writer, conf Config) error
```
Write writes a configuration to the supplied writer.




#### <a name="github.com/billziss-gh/golib/config/Dialect.WriteTyped">func</a> (\*Dialect) [WriteTyped](config/config.go#L378)
``` go
func (dialect *Dialect) WriteTyped(writer io.Writer, conf TypedConfig) error
```
WriteTyped writes a typed configuration to the supplied writer.




### <a name="github.com/billziss-gh/golib/config/Section">type</a> [Section](config/config.go#L46)
``` go
type Section map[string]string
```
Section is used to store a configuration section as string properties.










### <a name="github.com/billziss-gh/golib/config/TypedConfig">type</a> [TypedConfig](config/config.go#L61)
``` go
type TypedConfig map[string]TypedSection
```
TypedConfig is used to store a configuration as typed properties.

When using Get, Set, Delete to manipulate properties the property names
follow the syntax SECTION.PROPNAME







#### <a name="github.com/billziss-gh/golib/config/ReadTyped">func</a> [ReadTyped](config/config.go#L535)
``` go
func ReadTyped(reader io.Reader) (TypedConfig, error)
```
ReadTyped reads a typed configuration from the supplied reader
using the default dialect.





#### <a name="github.com/billziss-gh/golib/config/TypedConfig.Delete">func</a> (TypedConfig) [Delete](config/config.go#L140)
``` go
func (conf TypedConfig) Delete(k string)
```
Delete deletes a property from the configuration.




#### <a name="github.com/billziss-gh/golib/config/TypedConfig.Get">func</a> (TypedConfig) [Get](config/config.go#L111)
``` go
func (conf TypedConfig) Get(k string) interface{}
```
Get gets a property from the configuration.




#### <a name="github.com/billziss-gh/golib/config/TypedConfig.Set">func</a> (TypedConfig) [Set](config/config.go#L125)
``` go
func (conf TypedConfig) Set(k string, v interface{})
```
Set sets a property in the configuration.




### <a name="github.com/billziss-gh/golib/config/TypedSection">type</a> [TypedSection](config/config.go#L55)
``` go
type TypedSection map[string]interface{}
```
TypedSection is used to store a configuration section as typed properties.

















----
## <a name="github.com/billziss-gh/golib/config/flag">Package flag</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/config/flag)]_

`import "github.com/billziss-gh/golib/config/flag"`

* [Overview](#github.com/billziss-gh/golib/config/flag/pkg-overview)
* [Index](#github.com/billziss-gh/golib/config/flag/pkg-index)

### <a name="github.com/billziss-gh/golib/config/flag/pkg-overview">Overview</a>
Package flag facilitates use of the standard library package flag with
package config.




### <a name="github.com/billziss-gh/golib/config/flag/pkg-index">Index</a>
* [func Visit(flagSet *flag.FlagSet, section config.TypedSection, names ...string)](#github.com/billziss-gh/golib/config/flag/Visit)
* [func VisitAll(flagSet *flag.FlagSet, section config.TypedSection, names ...string)](#github.com/billziss-gh/golib/config/flag/VisitAll)


##### <a name="github.com/billziss-gh/golib/config/flag/pkg-files">Package files</a>
[flag.go](config/flag/flag.go) 





### <a name="github.com/billziss-gh/golib/config/flag/Visit">func</a> [Visit](config/flag/flag.go#L24)
``` go
func Visit(flagSet *flag.FlagSet, section config.TypedSection, names ...string)
```
Visit gets the flags present in a command line as a typed configuration section.



### <a name="github.com/billziss-gh/golib/config/flag/VisitAll">func</a> [VisitAll](config/flag/flag.go#L51)
``` go
func VisitAll(flagSet *flag.FlagSet, section config.TypedSection, names ...string)
```
VisitAll gets all flags as a typed configuration section.











----
## <a name="github.com/billziss-gh/golib/errors">Package errors</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/errors)]_

`import "github.com/billziss-gh/golib/errors"`

* [Overview](#github.com/billziss-gh/golib/errors/pkg-overview)
* [Index](#github.com/billziss-gh/golib/errors/pkg-index)

### <a name="github.com/billziss-gh/golib/errors/pkg-overview">Overview</a>
Package errors implements functions for advanced error handling.

Errors in this package contain a message, a cause (an error that caused
this error) and an attachment (any interface{}). Errors also contain
information about the program location where they were created.

Errors can be printed using the fmt.Printf verbs %s, %q, %x, %X, %v. In
particular the %+v format will print an error complete with its stack trace.

Inspired by <a href="https://github.com/pkg/errors">https://github.com/pkg/errors</a>




### <a name="github.com/billziss-gh/golib/errors/pkg-index">Index</a>
* [func Attachment(err error) interface{}](#github.com/billziss-gh/golib/errors/Attachment)
* [func Cause(err error) error](#github.com/billziss-gh/golib/errors/Cause)
* [func HasAttachment(err error, attachment interface{}) bool](#github.com/billziss-gh/golib/errors/HasAttachment)
* [func HasCause(err error, cause error) bool](#github.com/billziss-gh/golib/errors/HasCause)
* [func New(message string, args ...interface{}) error](#github.com/billziss-gh/golib/errors/New)


##### <a name="github.com/billziss-gh/golib/errors/pkg-files">Package files</a>
[errors.go](errors/errors.go) 





### <a name="github.com/billziss-gh/golib/errors/Attachment">func</a> [Attachment](errors/errors.go#L185)
``` go
func Attachment(err error) interface{}
```
Attachment will return additional information attached to this error
(if any).



### <a name="github.com/billziss-gh/golib/errors/Cause">func</a> [Cause](errors/errors.go#L174)
``` go
func Cause(err error) error
```
Cause will return the error that caused this error (if any).



### <a name="github.com/billziss-gh/golib/errors/HasAttachment">func</a> [HasAttachment](errors/errors.go#L207)
``` go
func HasAttachment(err error, attachment interface{}) bool
```
HasAttachment determines if a particular attachment is in the causal chain
of this error.



### <a name="github.com/billziss-gh/golib/errors/HasCause">func</a> [HasCause](errors/errors.go#L196)
``` go
func HasCause(err error, cause error) bool
```
HasCause determines if a particular error is in the causal chain
of this error.



### <a name="github.com/billziss-gh/golib/errors/New">func</a> [New](errors/errors.go#L158)
``` go
func New(message string, args ...interface{}) error
```
New creates an error with a message. Additionally the error may contain
a cause (an error that caused this error) and an attachment (any
interface{}). New will also record information about the program location
where it was called.











----
## <a name="github.com/billziss-gh/golib/keyring">Package keyring</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/keyring)]_

`import "github.com/billziss-gh/golib/keyring"`

* [Overview](#github.com/billziss-gh/golib/keyring/pkg-overview)
* [Index](#github.com/billziss-gh/golib/keyring/pkg-index)

### <a name="github.com/billziss-gh/golib/keyring/pkg-overview">Overview</a>
Package keyring implements functions for accessing and storing passwords
in the system's keyring (Keychain on macOS, Credential Manager on
Windows, Secret Service on Linux).




### <a name="github.com/billziss-gh/golib/keyring/pkg-index">Index</a>
* [Constants](#github.com/billziss-gh/golib/keyring/pkg-constants)
* [func Delete(service, user string) error](#github.com/billziss-gh/golib/keyring/Delete)
* [func Get(service, user string) (string, error)](#github.com/billziss-gh/golib/keyring/Get)
* [func Set(service, user, pass string) error](#github.com/billziss-gh/golib/keyring/Set)
* [type FileKeyring](#github.com/billziss-gh/golib/keyring/FileKeyring)
  * [func (self *FileKeyring) Delete(service, user string) error](#github.com/billziss-gh/golib/keyring/FileKeyring.Delete)
  * [func (self *FileKeyring) Get(service, user string) (string, error)](#github.com/billziss-gh/golib/keyring/FileKeyring.Get)
  * [func (self *FileKeyring) Set(service, user, pass string) error](#github.com/billziss-gh/golib/keyring/FileKeyring.Set)
* [type Keyring](#github.com/billziss-gh/golib/keyring/Keyring)
* [type OverlayKeyring](#github.com/billziss-gh/golib/keyring/OverlayKeyring)
  * [func (self *OverlayKeyring) Delete(service, user string) error](#github.com/billziss-gh/golib/keyring/OverlayKeyring.Delete)
  * [func (self *OverlayKeyring) Get(service, user string) (string, error)](#github.com/billziss-gh/golib/keyring/OverlayKeyring.Get)
  * [func (self *OverlayKeyring) Set(service, user, pass string) error](#github.com/billziss-gh/golib/keyring/OverlayKeyring.Set)
* [type SystemKeyring](#github.com/billziss-gh/golib/keyring/SystemKeyring)
  * [func (self *SystemKeyring) Delete(service, user string) (err error)](#github.com/billziss-gh/golib/keyring/SystemKeyring.Delete)
  * [func (self *SystemKeyring) Get(service, user string) (pass string, err error)](#github.com/billziss-gh/golib/keyring/SystemKeyring.Get)
  * [func (self *SystemKeyring) Set(service, user, pass string) (err error)](#github.com/billziss-gh/golib/keyring/SystemKeyring.Set)


##### <a name="github.com/billziss-gh/golib/keyring/pkg-files">Package files</a>
[keyring_default.go](keyring/keyring_default.go) [keyring_file.go](keyring/keyring_file.go) [keyring_overlay.go](keyring/keyring_overlay.go) [keyring_windows.go](keyring/keyring_windows.go) 


### <a name="github.com/billziss-gh/golib/keyring/pkg-constants">Constants</a>
``` go
const ErrKeyring = "ErrKeyring"
```



### <a name="github.com/billziss-gh/golib/keyring/Delete">func</a> [Delete](keyring/keyring_default.go#L47)
``` go
func Delete(service, user string) error
```
Delete deletes the password for a service and user in the default keyring.



### <a name="github.com/billziss-gh/golib/keyring/Get">func</a> [Get](keyring/keyring_default.go#L37)
``` go
func Get(service, user string) (string, error)
```
Get gets the password for a service and user in the default keyring.



### <a name="github.com/billziss-gh/golib/keyring/Set">func</a> [Set](keyring/keyring_default.go#L42)
``` go
func Set(service, user, pass string) error
```
Set sets the password for a service and user in the default keyring.




### <a name="github.com/billziss-gh/golib/keyring/FileKeyring">type</a> [FileKeyring](keyring/keyring_file.go#L27)
``` go
type FileKeyring struct {
    Path string
    Key  []byte
    // contains filtered or unexported fields
}

```
FileKeyring is a keyring that stores passwords in a file.










#### <a name="github.com/billziss-gh/golib/keyring/FileKeyring.Delete">func</a> (\*FileKeyring) [Delete](keyring/keyring_file.go#L112)
``` go
func (self *FileKeyring) Delete(service, user string) error
```



#### <a name="github.com/billziss-gh/golib/keyring/FileKeyring.Get">func</a> (\*FileKeyring) [Get](keyring/keyring_file.go#L69)
``` go
func (self *FileKeyring) Get(service, user string) (string, error)
```



#### <a name="github.com/billziss-gh/golib/keyring/FileKeyring.Set">func</a> (\*FileKeyring) [Set](keyring/keyring_file.go#L87)
``` go
func (self *FileKeyring) Set(service, user, pass string) error
```



### <a name="github.com/billziss-gh/golib/keyring/Keyring">type</a> [Keyring](keyring/keyring_default.go#L22)
``` go
type Keyring interface {
    // Get gets the password for a service and user.
    Get(service, user string) (string, error)

    // Set sets the password for a service and user.
    Set(service, user, pass string) error

    // Delete deletes the password for a service and user.
    Delete(service, user string) error
}
```
Keyring is the interface that a system-specific or custom keyring must
implement.


``` go
var DefaultKeyring Keyring
```
The default keyring.










### <a name="github.com/billziss-gh/golib/keyring/OverlayKeyring">type</a> [OverlayKeyring](keyring/keyring_overlay.go#L23)
``` go
type OverlayKeyring struct {
    Keyrings []Keyring
    // contains filtered or unexported fields
}

```
OverlayKeyring is a keyring that stores passwords in a hierarchy of keyrings.










#### <a name="github.com/billziss-gh/golib/keyring/OverlayKeyring.Delete">func</a> (\*OverlayKeyring) [Delete](keyring/keyring_overlay.go#L53)
``` go
func (self *OverlayKeyring) Delete(service, user string) error
```



#### <a name="github.com/billziss-gh/golib/keyring/OverlayKeyring.Get">func</a> (\*OverlayKeyring) [Get](keyring/keyring_overlay.go#L28)
``` go
func (self *OverlayKeyring) Get(service, user string) (string, error)
```



#### <a name="github.com/billziss-gh/golib/keyring/OverlayKeyring.Set">func</a> (\*OverlayKeyring) [Set](keyring/keyring_overlay.go#L42)
``` go
func (self *OverlayKeyring) Set(service, user, pass string) error
```



### <a name="github.com/billziss-gh/golib/keyring/SystemKeyring">type</a> [SystemKeyring](keyring/keyring_windows.go#L24)
``` go
type SystemKeyring struct {
}

```
SystemKeyring implements the system-specific keyring.










#### <a name="github.com/billziss-gh/golib/keyring/SystemKeyring.Delete">func</a> (\*SystemKeyring) [Delete](keyring/keyring_windows.go#L148)
``` go
func (self *SystemKeyring) Delete(service, user string) (err error)
```



#### <a name="github.com/billziss-gh/golib/keyring/SystemKeyring.Get">func</a> (\*SystemKeyring) [Get](keyring/keyring_windows.go#L124)
``` go
func (self *SystemKeyring) Get(service, user string) (pass string, err error)
```



#### <a name="github.com/billziss-gh/golib/keyring/SystemKeyring.Set">func</a> (\*SystemKeyring) [Set](keyring/keyring_windows.go#L135)
``` go
func (self *SystemKeyring) Set(service, user, pass string) (err error)
```










----
## <a name="github.com/billziss-gh/golib/retry">Package retry</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/retry)]_

`import "github.com/billziss-gh/golib/retry"`

* [Overview](#github.com/billziss-gh/golib/retry/pkg-overview)
* [Index](#github.com/billziss-gh/golib/retry/pkg-index)

### <a name="github.com/billziss-gh/golib/retry/pkg-overview">Overview</a>
Package retry implements simple retry functionality.

For example to retry an HTTP request:


	func Do(client *http.Client, req *http.Request) (rsp *http.Response, err error) {
	    retry.Retry(
	        retry.Count(5),
	        retry.Backoff(time.Second, time.Second*30),
	        func(i int) bool {
	            if 0 < i {
	                req.Body, err = req.GetBody()
	                if nil != err {
	                    return false
	                }
	            }
	            rsp, err = client.Do(req)
	            if nil != err {
	                return false
	            }
	            if 500 <= rsp.StatusCode && nil != req.GetBody {
	                rsp.Body.Close()
	                return true
	            }
	            return false
	        })
	
	    return
	}




### <a name="github.com/billziss-gh/golib/retry/pkg-index">Index</a>
* [func Backoff(sleep, maxsleep time.Duration) func(int) bool](#github.com/billziss-gh/golib/retry/Backoff)
* [func Count(retries int) func(int) bool](#github.com/billziss-gh/golib/retry/Count)
* [func Retry(actions ...func(int) bool)](#github.com/billziss-gh/golib/retry/Retry)


##### <a name="github.com/billziss-gh/golib/retry/pkg-files">Package files</a>
[retry.go](retry/retry.go) 





### <a name="github.com/billziss-gh/golib/retry/Backoff">func</a> [Backoff](retry/retry.go#L67)
``` go
func Backoff(sleep, maxsleep time.Duration) func(int) bool
```
Backoff implements an exponential backoff with jitter.



### <a name="github.com/billziss-gh/golib/retry/Count">func</a> [Count](retry/retry.go#L60)
``` go
func Count(retries int) func(int) bool
```
Count limits the number of retries performed by Retry.



### <a name="github.com/billziss-gh/golib/retry/Retry">func</a> [Retry](retry/retry.go#L49)
``` go
func Retry(actions ...func(int) bool)
```
Retry performs actions repeatedly until one of the actions returns false.











----
## <a name="github.com/billziss-gh/golib/shlex">Package shlex</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/shlex)]_

`import "github.com/billziss-gh/golib/shlex"`

* [Overview](#github.com/billziss-gh/golib/shlex/pkg-overview)
* [Index](#github.com/billziss-gh/golib/shlex/pkg-index)

### <a name="github.com/billziss-gh/golib/shlex/pkg-overview">Overview</a>
Package shlex is used for simple command line splitting.

Both POSIX and Windows dialects are provided.




### <a name="github.com/billziss-gh/golib/shlex/pkg-index">Index</a>
* [Constants](#github.com/billziss-gh/golib/shlex/pkg-constants)
* [Variables](#github.com/billziss-gh/golib/shlex/pkg-variables)
* [type Dialect](#github.com/billziss-gh/golib/shlex/Dialect)
  * [func (dialect *Dialect) Split(line string) (tokens []string)](#github.com/billziss-gh/golib/shlex/Dialect.Split)


##### <a name="github.com/billziss-gh/golib/shlex/pkg-files">Package files</a>
[shlex.go](shlex/shlex.go) 


### <a name="github.com/billziss-gh/golib/shlex/pkg-constants">Constants</a>
``` go
const (
    Space       = rune(' ')
    Word        = rune('A')
    DoubleQuote = rune('"')
    SingleQuote = rune('\'')
    EmptyRune   = rune(-2)
    NoEscape    = rune(-1)
)
```

### <a name="github.com/billziss-gh/golib/shlex/pkg-variables">Variables</a>
``` go
var Posix = Dialect{
    IsSpace: func(r rune) bool {
        return ' ' == r || '\t' == r || '\n' == r
    },
    IsQuote: func(r rune) bool {
        return '"' == r || '\'' == r
    },
    Escape: func(s rune, r, r0 rune) rune {
        if '\\' != r {
            return NoEscape
        }
        switch s {
        case Space, Word:
            if '\n' == r0 || EmptyRune == r0 {
                return EmptyRune
            }
            return r0
        case DoubleQuote:
            if '\n' == r0 || EmptyRune == r0 {
                return EmptyRune
            }
            if '$' == r0 || '`' == r0 || '"' == r0 || '\\' == r0 {
                return r0
            }
            return NoEscape
        default:
            return NoEscape
        }
    },
}
```
Posix is the POSIX dialect of command line splitting.
See <a href="https://tinyurl.com/26man79">https://tinyurl.com/26man79</a> for guidelines.

``` go
var Windows = Dialect{
    IsSpace: func(r rune) bool {
        return ' ' == r || '\t' == r || '\r' == r || '\n' == r
    },
    IsQuote: func(r rune) bool {
        return '"' == r
    },
    Escape: func(s rune, r, r0 rune) rune {
        switch s {
        case Space, Word:
            if '\\' == r && '"' == r0 {
                return r0
            }
            return NoEscape
        case DoubleQuote:
            if ('\\' == r || '"' == r) && '"' == r0 {
                return r0
            }
            return NoEscape
        default:
            return NoEscape
        }
    },
    LongEscape: func(s rune, r rune, line string) ([]rune, string, rune, int) {

        if '\\' != r {
            return nil, "", 0, 0
        }

        var w int
        n := 0
        for {
            r, w = utf8.DecodeRuneInString(line[n:])
            n++
            if 0 == w || '\\' != r {
                break
            }
        }

        if 2 > n {
            return nil, "", 0, 0
        }

        if '"' != r {
            return []rune(strings.Repeat("\\", n-1)), line[n-1:], r, w
        } else if 0 == n&1 {
            return []rune(strings.Repeat("\\", n/2-1)), line[n-1:], '"', 1
        } else {
            return []rune(strings.Repeat("\\", n/2-1)), line[n-2:], '\\', 1
        }
    },
}
```
Windows is the Windows dialect of command line splitting.
See <a href="https://tinyurl.com/ycdj5ghh">https://tinyurl.com/ycdj5ghh</a> for guidelines.




### <a name="github.com/billziss-gh/golib/shlex/Dialect">type</a> [Dialect](shlex/shlex.go#L33)
``` go
type Dialect struct {
    IsSpace    func(r rune) bool
    IsQuote    func(r rune) bool
    Escape     func(s rune, r, r0 rune) rune
    LongEscape func(s rune, r rune, line string) ([]rune, string, rune, int)
}

```
Dialect represents a dialect of command line splitting.










#### <a name="github.com/billziss-gh/golib/shlex/Dialect.Split">func</a> (\*Dialect) [Split](shlex/shlex.go#L141)
``` go
func (dialect *Dialect) Split(line string) (tokens []string)
```
Split splits a command line into tokens according to the chosen dialect.











----
## <a name="github.com/billziss-gh/golib/terminal">Package terminal</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/terminal)]_

`import "github.com/billziss-gh/golib/terminal"`

* [Overview](#github.com/billziss-gh/golib/terminal/pkg-overview)
* [Index](#github.com/billziss-gh/golib/terminal/pkg-index)

### <a name="github.com/billziss-gh/golib/terminal/pkg-overview">Overview</a>
Package terminal provides functionality for terminals.




### <a name="github.com/billziss-gh/golib/terminal/pkg-index">Index</a>
* [Variables](#github.com/billziss-gh/golib/terminal/pkg-variables)
* [func AnsiEscapeCode(code string) string](#github.com/billziss-gh/golib/terminal/AnsiEscapeCode)
* [func Escape(s string, delims string, escape func(string) string) string](#github.com/billziss-gh/golib/terminal/Escape)
* [func GetSize(fd uintptr) (int, int, error)](#github.com/billziss-gh/golib/terminal/GetSize)
* [func IsAnsiTerminal(fd uintptr) bool](#github.com/billziss-gh/golib/terminal/IsAnsiTerminal)
* [func IsTerminal(fd uintptr) bool](#github.com/billziss-gh/golib/terminal/IsTerminal)
* [func NewEscapeWriter(writer io.Writer, delims string, escape func(string) string) io.Writer](#github.com/billziss-gh/golib/terminal/NewEscapeWriter)
* [func NewReader(r io.Reader) io.Reader](#github.com/billziss-gh/golib/terminal/NewReader)
* [func NullEscapeCode(code string) string](#github.com/billziss-gh/golib/terminal/NullEscapeCode)
* [func SetState(fd uintptr, s State) error](#github.com/billziss-gh/golib/terminal/SetState)
* [type State](#github.com/billziss-gh/golib/terminal/State)
  * [func GetState(fd uintptr) (State, error)](#github.com/billziss-gh/golib/terminal/GetState)
  * [func MakeRaw(fd uintptr) (State, error)](#github.com/billziss-gh/golib/terminal/MakeRaw)


##### <a name="github.com/billziss-gh/golib/terminal/pkg-files">Package files</a>
[codes.go](terminal/codes.go) [escape.go](terminal/escape.go) [reader.go](terminal/reader.go) [reader_windows.go](terminal/reader_windows.go) [stdio.go](terminal/stdio.go) [terminal.go](terminal/terminal.go) [terminal_windows.go](terminal/terminal_windows.go) 



### <a name="github.com/billziss-gh/golib/terminal/pkg-variables">Variables</a>
``` go
var Stderr io.Writer
```
``` go
var Stdout io.Writer
```


### <a name="github.com/billziss-gh/golib/terminal/AnsiEscapeCode">func</a> [AnsiEscapeCode](terminal/codes.go#L24)
``` go
func AnsiEscapeCode(code string) string
```
AnsiEscapeCode translates a named escape code to its ANSI equivalent.



### <a name="github.com/billziss-gh/golib/terminal/Escape">func</a> [Escape](terminal/escape.go#L28)
``` go
func Escape(s string, delims string, escape func(string) string) string
```
Escape replaces escape code instances within a string. Escape codes
must be delimited using the delimiters in the delims parameter, which
has the syntax "START END". For example, to use {{ and }} as delimiters
specify "{{ }}".

For consistency with NewEscapeWriter, Escape will discard an unterminated escape
code. For example, if delims is "{{ }}" and the string s is "hello {{world",
the resulting string will be "hello ".



### <a name="github.com/billziss-gh/golib/terminal/GetSize">func</a> [GetSize](terminal/terminal.go#L46)
``` go
func GetSize(fd uintptr) (int, int, error)
```
GetSize gets the terminal size (cols x rows).



### <a name="github.com/billziss-gh/golib/terminal/IsAnsiTerminal">func</a> [IsAnsiTerminal](terminal/terminal.go#L23)
``` go
func IsAnsiTerminal(fd uintptr) bool
```
IsAnsiTerminal determines if the file descriptor describes a terminal
that has ANSI capabilities.



### <a name="github.com/billziss-gh/golib/terminal/IsTerminal">func</a> [IsTerminal](terminal/terminal.go#L17)
``` go
func IsTerminal(fd uintptr) bool
```
IsTerminal determines if the file descriptor describes a terminal.



### <a name="github.com/billziss-gh/golib/terminal/NewEscapeWriter">func</a> [NewEscapeWriter](terminal/escape.go#L178)
``` go
func NewEscapeWriter(writer io.Writer, delims string, escape func(string) string) io.Writer
```
NewEscapeWriter replaces escape code instances within a string. Escape codes
must be delimited using the delimiters in the delims parameter, which
has the syntax "START END". For example, to use {{ and }} as delimiters
specify "{{ }}".

Because NewEscapeWriter is an io.Writer it cannot know when the last Write
will be received. For this reason it will discard an unterminated escape
code. For example, if delims is "{{ }}" and the string s is "hello {{world",
the resulting string will be "hello ".



### <a name="github.com/billziss-gh/golib/terminal/NewReader">func</a> [NewReader](terminal/reader.go#L20)
``` go
func NewReader(r io.Reader) io.Reader
```
NewReader reads terminal input, including special keys.



### <a name="github.com/billziss-gh/golib/terminal/NullEscapeCode">func</a> [NullEscapeCode](terminal/codes.go#L19)
``` go
func NullEscapeCode(code string) string
```
NullEscapeCode translates a named escape code to the empty string.
It is used to eliminate escape codes.



### <a name="github.com/billziss-gh/golib/terminal/SetState">func</a> [SetState](terminal/terminal.go#L34)
``` go
func SetState(fd uintptr, s State) error
```



### <a name="github.com/billziss-gh/golib/terminal/State">type</a> [State](terminal/terminal.go#L27)
``` go
type State *state
```






#### <a name="github.com/billziss-gh/golib/terminal/GetState">func</a> [GetState](terminal/terminal.go#L29)
``` go
func GetState(fd uintptr) (State, error)
```

#### <a name="github.com/billziss-gh/golib/terminal/MakeRaw">func</a> [MakeRaw](terminal/terminal.go#L40)
``` go
func MakeRaw(fd uintptr) (State, error)
```
MakeRaw puts the terminal in "raw" mode. In this mode the terminal performs
minimal processing. The fd should be the file descriptor of the terminal input.












----
## <a name="github.com/billziss-gh/golib/terminal/editor">Package editor</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/terminal/editor)]_

`import "github.com/billziss-gh/golib/terminal/editor"`

* [Overview](#github.com/billziss-gh/golib/terminal/editor/pkg-overview)
* [Index](#github.com/billziss-gh/golib/terminal/editor/pkg-index)

### <a name="github.com/billziss-gh/golib/terminal/editor/pkg-overview">Overview</a>
Package editor provides simple readline functionality for Go programs.




### <a name="github.com/billziss-gh/golib/terminal/editor/pkg-index">Index</a>
* [Variables](#github.com/billziss-gh/golib/terminal/editor/pkg-variables)
* [func GetLine(prompt string) (string, error)](#github.com/billziss-gh/golib/terminal/editor/GetLine)
* [func GetPass(prompt string) (string, error)](#github.com/billziss-gh/golib/terminal/editor/GetPass)
* [type Editor](#github.com/billziss-gh/golib/terminal/editor/Editor)
  * [func NewEditor(in *os.File, out *os.File) *Editor](#github.com/billziss-gh/golib/terminal/editor/NewEditor)
  * [func (self *Editor) GetLine(prompt string) (string, error)](#github.com/billziss-gh/golib/terminal/editor/Editor.GetLine)
  * [func (self *Editor) GetPass(prompt string) (string, error)](#github.com/billziss-gh/golib/terminal/editor/Editor.GetPass)
  * [func (self *Editor) History() *History](#github.com/billziss-gh/golib/terminal/editor/Editor.History)
  * [func (self *Editor) SetCompletionHandler(handler func(line string) []string)](#github.com/billziss-gh/golib/terminal/editor/Editor.SetCompletionHandler)
* [type History](#github.com/billziss-gh/golib/terminal/editor/History)
  * [func NewHistory() *History](#github.com/billziss-gh/golib/terminal/editor/NewHistory)
  * [func (self *History) Add(line string)](#github.com/billziss-gh/golib/terminal/editor/History.Add)
  * [func (self *History) Clear()](#github.com/billziss-gh/golib/terminal/editor/History.Clear)
  * [func (self *History) Delete(id int)](#github.com/billziss-gh/golib/terminal/editor/History.Delete)
  * [func (self *History) Enum(id int, fn func(id int, line string) bool)](#github.com/billziss-gh/golib/terminal/editor/History.Enum)
  * [func (self *History) Get(id int, dir int) (int, string)](#github.com/billziss-gh/golib/terminal/editor/History.Get)
  * [func (self *History) Len() int](#github.com/billziss-gh/golib/terminal/editor/History.Len)
  * [func (self *History) Read(reader io.Reader) (err error)](#github.com/billziss-gh/golib/terminal/editor/History.Read)
  * [func (self *History) Reset()](#github.com/billziss-gh/golib/terminal/editor/History.Reset)
  * [func (self *History) SetCap(cap int)](#github.com/billziss-gh/golib/terminal/editor/History.SetCap)
  * [func (self *History) Write(writer io.Writer) (err error)](#github.com/billziss-gh/golib/terminal/editor/History.Write)


##### <a name="github.com/billziss-gh/golib/terminal/editor/pkg-files">Package files</a>
[doc.go](terminal/editor/doc.go) [editor.go](terminal/editor/editor.go) [history.go](terminal/editor/history.go) 



### <a name="github.com/billziss-gh/golib/terminal/editor/pkg-variables">Variables</a>
``` go
var DefaultEditor = NewEditor(os.Stdin, os.Stdout)
```
DefaultEditor is the default Editor.



### <a name="github.com/billziss-gh/golib/terminal/editor/GetLine">func</a> [GetLine](terminal/editor/editor.go#L450)
``` go
func GetLine(prompt string) (string, error)
```
GetLine gets a line from the terminal.



### <a name="github.com/billziss-gh/golib/terminal/editor/GetPass">func</a> [GetPass](terminal/editor/editor.go#L455)
``` go
func GetPass(prompt string) (string, error)
```
GetPass gets a password from the terminal.




### <a name="github.com/billziss-gh/golib/terminal/editor/Editor">type</a> [Editor](terminal/editor/editor.go#L58)
``` go
type Editor struct {
    // contains filtered or unexported fields
}

```
Editor is a command line editor with history and completion handling.







#### <a name="github.com/billziss-gh/golib/terminal/editor/NewEditor">func</a> [NewEditor](terminal/editor/editor.go#L436)
``` go
func NewEditor(in *os.File, out *os.File) *Editor
```
NewEditor creates a new editor.





#### <a name="github.com/billziss-gh/golib/terminal/editor/Editor.GetLine">func</a> (\*Editor) [GetLine](terminal/editor/editor.go#L408)
``` go
func (self *Editor) GetLine(prompt string) (string, error)
```
GetLine gets a line from the terminal.




#### <a name="github.com/billziss-gh/golib/terminal/editor/Editor.GetPass">func</a> (\*Editor) [GetPass](terminal/editor/editor.go#L417)
``` go
func (self *Editor) GetPass(prompt string) (string, error)
```
GetPass gets a password from the terminal.




#### <a name="github.com/billziss-gh/golib/terminal/editor/Editor.History">func</a> (\*Editor) [History](terminal/editor/editor.go#L431)
``` go
func (self *Editor) History() *History
```
History returns the editor's command line history.




#### <a name="github.com/billziss-gh/golib/terminal/editor/Editor.SetCompletionHandler">func</a> (\*Editor) [SetCompletionHandler](terminal/editor/editor.go#L426)
``` go
func (self *Editor) SetCompletionHandler(handler func(line string) []string)
```
SetCompletionHandler sets a completion handler.




### <a name="github.com/billziss-gh/golib/terminal/editor/History">type</a> [History](terminal/editor/history.go#L23)
``` go
type History struct {
    // contains filtered or unexported fields
}

```
History maintains a buffer of command lines.







#### <a name="github.com/billziss-gh/golib/terminal/editor/NewHistory">func</a> [NewHistory](terminal/editor/history.go#L218)
``` go
func NewHistory() *History
```
NewHistory creates a new history buffer.





#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Add">func</a> (\*History) [Add](terminal/editor/history.go#L127)
``` go
func (self *History) Add(line string)
```
Add adds a new command line to the history buffer.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Clear">func</a> (\*History) [Clear](terminal/editor/history.go#L147)
``` go
func (self *History) Clear()
```
Clear clears all command lines from the history buffer.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Delete">func</a> (\*History) [Delete](terminal/editor/history.go#L137)
``` go
func (self *History) Delete(id int)
```
Delete deletes a command line from the history buffer.
The special id's of 0 or -1 mean to delete the first or last command line
respectively.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Enum">func</a> (\*History) [Enum](terminal/editor/history.go#L112)
``` go
func (self *History) Enum(id int, fn func(id int, line string) bool)
```
Enum enumerates all command lines in the history buffer starting at id.
The special id's of 0 or -1 mean to start the enumeration with the first or
last command line respectively.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Get">func</a> (\*History) [Get](terminal/editor/history.go#L85)
``` go
func (self *History) Get(id int, dir int) (int, string)
```
Get gets a command line from the history buffer.

Command lines are identified by an integer id. The special id's of 0 or -1 mean to
retrieve the first or last command line respectively. The dir parameter is used to
determine which command line to retrieve relative to the one identified by id: 0 is
the current command line, +1 is the next command line, -1 is the previous command line,
etc. When retrieving command lines the history is treated as a circular buffer.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Len">func</a> (\*History) [Len](terminal/editor/history.go#L102)
``` go
func (self *History) Len() int
```
Len returns the length of the history buffer.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Read">func</a> (\*History) [Read](terminal/editor/history.go#L155)
``` go
func (self *History) Read(reader io.Reader) (err error)
```
Read reads command lines from a reader into the history buffer.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Reset">func</a> (\*History) [Reset](terminal/editor/history.go#L208)
``` go
func (self *History) Reset()
```
Reset fully resets the history buffer.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.SetCap">func</a> (\*History) [SetCap](terminal/editor/history.go#L198)
``` go
func (self *History) SetCap(cap int)
```
SetCap sets the capacity (number of command lines) of the history buffer.




#### <a name="github.com/billziss-gh/golib/terminal/editor/History.Write">func</a> (\*History) [Write](terminal/editor/history.go#L181)
``` go
func (self *History) Write(writer io.Writer) (err error)
```
Write writes command lines to a writer from the history buffer.











----
## <a name="github.com/billziss-gh/golib/trace">Package trace</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/trace)]_

`import "github.com/billziss-gh/golib/trace"`

* [Overview](#github.com/billziss-gh/golib/trace/pkg-overview)
* [Index](#github.com/billziss-gh/golib/trace/pkg-index)

### <a name="github.com/billziss-gh/golib/trace/pkg-overview">Overview</a>
Package trace provides a simple tracing facility for Go functions.
Given the function below, program execution will be traced whenever
the function is entered or exited.


	func fn(p1 ptype1, p2 ptype2, ...) (r1 rtyp1, r2 rtype2, ...) {
	    defer trace.Trace(0, "TRACE", p1, p2)(&r1, &r2)
	    // ...
	}

The trace facility is disabled unless the variable Verbose is true and
the environment variable GOLIB_TRACE is set to a pattern matching one
of the traced functions. A pattern is a a comma-separated list of
file-style patterns containing wildcards such as * and ?.




### <a name="github.com/billziss-gh/golib/trace/pkg-index">Index</a>
* [Variables](#github.com/billziss-gh/golib/trace/pkg-variables)
* [func Trace(skip int, prfx string, vals ...interface{}) func(vals ...interface{})](#github.com/billziss-gh/golib/trace/Trace)
* [func Tracef(skip int, form string, vals ...interface{})](#github.com/billziss-gh/golib/trace/Tracef)


##### <a name="github.com/billziss-gh/golib/trace/pkg-files">Package files</a>
[trace.go](trace/trace.go) 



### <a name="github.com/billziss-gh/golib/trace/pkg-variables">Variables</a>
``` go
var (
    Verbose = false
    Pattern = os.Getenv("GOLIB_TRACE")

    Logger = log.New(terminal.Stderr, "", log.LstdFlags)
)
```


### <a name="github.com/billziss-gh/golib/trace/Trace">func</a> [Trace](trace/trace.go#L135)
``` go
func Trace(skip int, prfx string, vals ...interface{}) func(vals ...interface{})
```


### <a name="github.com/billziss-gh/golib/trace/Tracef">func</a> [Tracef](trace/trace.go#L166)
``` go
func Tracef(skip int, form string, vals ...interface{})
```










----
## <a name="github.com/billziss-gh/golib/util">Package util</a>
_[[godoc.org](https://godoc.org/github.com/billziss-gh/golib/util)]_

`import "github.com/billziss-gh/golib/util"`

* [Overview](#github.com/billziss-gh/golib/util/pkg-overview)
* [Index](#github.com/billziss-gh/golib/util/pkg-index)

### <a name="github.com/billziss-gh/golib/util/pkg-overview">Overview</a>
Package util contains general utility functions.




### <a name="github.com/billziss-gh/golib/util/pkg-index">Index</a>
* [func ReadAeData(path string, key []byte) (data []byte, err error)](#github.com/billziss-gh/golib/util/ReadAeData)
* [func ReadData(path string) (data []byte, err error)](#github.com/billziss-gh/golib/util/ReadData)
* [func ReadFunc(path string, fn func(*os.File) (interface{}, error)) (data interface{}, err error)](#github.com/billziss-gh/golib/util/ReadFunc)
* [func WriteAeData(path string, perm os.FileMode, data []byte, key []byte) (err error)](#github.com/billziss-gh/golib/util/WriteAeData)
* [func WriteData(path string, perm os.FileMode, data []byte) (err error)](#github.com/billziss-gh/golib/util/WriteData)
* [func WriteFunc(path string, perm os.FileMode, fn func(*os.File) error) (err error)](#github.com/billziss-gh/golib/util/WriteFunc)


##### <a name="github.com/billziss-gh/golib/util/pkg-files">Package files</a>
[doc.go](util/doc.go) [ioae.go](util/ioae.go) [ioutil.go](util/ioutil.go) 





### <a name="github.com/billziss-gh/golib/util/ReadAeData">func</a> [ReadAeData](util/ioae.go#L24)
``` go
func ReadAeData(path string, key []byte) (data []byte, err error)
```


### <a name="github.com/billziss-gh/golib/util/ReadData">func</a> [ReadData](util/ioutil.go#L37)
``` go
func ReadData(path string) (data []byte, err error)
```


### <a name="github.com/billziss-gh/golib/util/ReadFunc">func</a> [ReadFunc](util/ioutil.go#L24)
``` go
func ReadFunc(path string, fn func(*os.File) (interface{}, error)) (data interface{}, err error)
```


### <a name="github.com/billziss-gh/golib/util/WriteAeData">func</a> [WriteAeData](util/ioae.go#L56)
``` go
func WriteAeData(path string, perm os.FileMode, data []byte, key []byte) (err error)
```


### <a name="github.com/billziss-gh/golib/util/WriteData">func</a> [WriteData](util/ioutil.go#L91)
``` go
func WriteData(path string, perm os.FileMode, data []byte) (err error)
```


### <a name="github.com/billziss-gh/golib/util/WriteFunc">func</a> [WriteFunc](util/ioutil.go#L49)
``` go
func WriteFunc(path string, perm os.FileMode, fn func(*os.File) error) (err error)
```







