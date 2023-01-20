# Oracle Database Configuration

The purpose of this document is to instruct on how to use the Database Configuration in the TFS - Execute PL/SQL task.

## Overview

The Database configuration allows for source controlling tablespaces, profiles, users(schemas), roles, directories, database links and most importantly permissions.  This allows for immutable configurations that can be easily deployed as development occurs.  

The configurations are stored inside of .json files and can be added to any Oracle project.  The Database Configuration takes information from the .json files and converts it into SQL to apply the configuration that is run on the database.  This gives complete traceability on who, what, why and when a configuration change was made, and allows for consistent deployments of code.

Configurations will be run in a specific order
1. Tablespaces
1. Profiles
1. Users/Schemas
1. Roles
1. Directories
1. Privileges/Permissions
1. Database Links

## Configuration Objects
### Tablespaces

| Input Name | Mandatory | Data Type | Default Value | Example | Allowed Values |
| :--- | :---: | :---: | :---: | :--- | --- |
| name | Yes | String | | "name": "\<tablespace name\>" | Any |
| blocksize | No | Number | 8 | "blocksize": 8 | 8, 16, 32 |
| autoextend | No | String | "OFF" | "autoextend": "ON" | ON, OFF |
| initialsize | No | String | "20G" | "initialsize": "25G" | Any number followed by an "M" (for megabytes) or "G" (for Gigabytes) | 
| bigfile | No | String | "true" | "bigfile": "false" | "true","false"|

### Profiles
| Input Name | Mandatory | Data Type | Default Value | Example | Allowed Values |
| :--- | :---: | :---: | :---: | :--- | --- |
| name | Yes | String | | "name": "\<profile name>" | Any
| password_parameters | No | Array | | {"name": "FAILED_LOGIN_ATTEMPTS", "value": "DEFAULT"}, {"name": "PASSWORD_LIFE_TIME", "value": "DEFAULT"} | Those allowed for Profile Configuration | 
| resource_parameters | No | Array | | {"name": "COMPOSITE_LIMIT", "value": "DEFAULT"},{"name": "SESSIONS_PER_USER", "value": "DEFAULT"} | Those allowed for Profile Configuration |

### Users
| Input Name | Mandatory | Data Type | Default Value | Example | Allowed Values |
| :--- | :---: | :---: | :---: | :--- | --- |
| name | Yes | String | | "name": "\<User Name>" | Any |
| passwordType | Yes | String | | "passwordType": "\<allowed value>" | "PipelineVariable", "Global", "External" |
| passwordDN | If passwordType is "Global" or "External" | String | | "passwordDN": "\<Active Directory Distinguished Name>" | Any |
| gatekeeperProxyFlag | No | boolean | false | "gatekeeperProxyFlag": true | true, false |
| profile | No | String | DEFAULT | "profile": "INL_LUA" | Any profile in the database |
| tablespace | No | String | USERS | "tablespace": "USERS" | Any tablespace in the database |
| quota | Array | No | | see Quotas | |
| privileges | Array | No | | see Privileges | |

### Quotas
| Input Name | Mandatory | Data Type | Default Value | Example | Allowed Values |
| :--- | :---: | :---: | :---: | :--- | --- |
| size | Yes | String | | "size": "20G" | Any number followed by an "M" (for megabytes) or "G" (for Gigabytes) or "Unlimited" |
|  tablespace | Yes | String | | "tablespace": "USERS" | Any Tablespace in the Database |

### Roles
| Input Name | Mandatory | Data Type | Default Value | Example | Allowed Values |
| :--- | :---: | :---: | :---: | :--- | --- |
| name | Yes | String | | "name": "\<Role Name>" | Any |
| passwordType | No | String | | "passwordType": "\<Allowed Type>" | "PipelineVariable", "Global", "External" |
| passwordDN | If passwordType is "Global" or "External" | String | | "passwordDN": "\<Active Directory Distinguished Name>" | |
| privileges | No | String | | See Privileges | | |

### Directories
| Input Name | Mandatory | Data Type | Default Value | Example | Allowed Values |
| :--- | :---: | :---: | :---: | :--- | --- |
| name | Yes | String | | "name": "DIRECTORY.\<Directory Name>" | Any |
| path | Yes | String | | "path": "/dir1/dir2/" | Any | 

### Database Links