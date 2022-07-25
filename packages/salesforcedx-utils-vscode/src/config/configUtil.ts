/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ConfigAggregator,
  ConfigFile,
  ConfigValue,
  SfConfigProperties
} from '@salesforce/core';
import * as path from 'path';
import { GlobalCliEnvironment } from '../cli';
import { TelemetryService } from '../telemetry/telemetry';
import { getRootWorkspacePath } from '../workspaces';
import { DEFAULT_USERNAME_KEY } from '../types';

export enum ConfigSource {
  Local,
  Global,
  None
}

// This class should be reworked or removed once the ConfigAggregator correctly checks
// local as well as global configs. It's also worth noting that ConfigAggregator, according
// to its docs checks local, global and environment and, for our purposes, environment may
// not be viable.

export class ConfigUtil {
  public static async getConfigSource(key: string): Promise<ConfigSource> {
    let value = await ConfigUtil.getConfigValue(key, ConfigSource.Local);
    if (!(value === null || value === undefined)) {
      return ConfigSource.Local;
    }
    value = await ConfigUtil.getConfigValue(key, ConfigSource.Global);
    if (!(value === null || value === undefined)) {
      return ConfigSource.Global;
    }
    return ConfigSource.None;
  }

  public static async getConfigValue(
    key: string,
    source?: ConfigSource.Global | ConfigSource.Local
  ): Promise<ConfigValue | undefined> {
    if (source === undefined || source === ConfigSource.Local) {
      try {
        const rootPath = getRootWorkspacePath();
        const myLocalConfig = await ConfigFile.create({
          isGlobal: false,
          rootFolder: path.join(rootPath, '.sfdx'),
          filename: 'sfdx-config.json'
        });
        const localValue = myLocalConfig.get(key);
        if (!(localValue === null || localValue === undefined)) {
          return localValue;
        }
      } catch (err) {
        if (err instanceof Error) {
          TelemetryService.getInstance().sendException(
            'get_config_value_local',
            err.message
          );
        }
        return undefined;
      }
    }
    if (source === undefined || source === ConfigSource.Global) {
      try {
        const aggregator = await ConfigAggregator.create();
        const globalValue = aggregator.getPropertyValue(key);
        if (!(globalValue === null || globalValue === undefined)) {
          return globalValue;
        }
      } catch (err) {
        if (err instanceof Error) {
          TelemetryService.getInstance().sendException(
            'get_config_value_global',
            err.message
          );
        }
        return undefined;
      }
    }
    return undefined;
  }
}

export function disableCLITelemetry() {
  const ENV_SFDX_DISABLE_TELEMETRY = 'SFDX_DISABLE_TELEMETRY';
  GlobalCliEnvironment.environmentVariables.set(
    ENV_SFDX_DISABLE_TELEMETRY,
    'true'
  );
}

async function getConfigAggregator(): Promise<ConfigAggregator> {
  const origCurrentWorkingDirectory = process.cwd();
  const rootWorkspacePath = getRootWorkspacePath();
  // Change the current working directory to the project path,
  // so that ConfigAggregator reads the local project values
  process.chdir(rootWorkspacePath);
  const configAggregator = await ConfigAggregator.create();
  // Change the current working directory back to what it was
  // before returning
  process.chdir(origCurrentWorkingDirectory);
  return configAggregator;
}

export async function isCLITelemetryAllowed(): Promise<boolean> {
  try {
    const configAggregator = await getConfigAggregator();
    const disableTelemetry:
      | string
      | undefined = configAggregator.getPropertyValue(
      SfConfigProperties.DISABLE_TELEMETRY
    );
    return disableTelemetry !== 'true';
  } catch (e) {
    console.log('Error checking cli settings: ' + e);
  }
  return true;
}

export async function getDefaultUsernameOrAlias(): Promise<string | undefined> {
  try {
    const defaultUserName = await ConfigUtil.getConfigValue(
      DEFAULT_USERNAME_KEY
    );
    if (defaultUserName === undefined) {
      return undefined;
    }

    return JSON.stringify(defaultUserName).replace(/\"/g, '');
  } catch (err) {
    console.error(err);
    TelemetryService.getInstance().sendException(
      'get_default_username_alias',
      err.message
    );
    return undefined;
  }
}
