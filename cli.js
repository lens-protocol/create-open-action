#!/usr/bin/env node

import chalk from 'chalk'
import path from 'path'
import fs from 'fs'
import { input } from '@inquirer/prompts'
import { Command } from 'commander'
import {execa, execaCommand} from 'execa'
import ora from 'ora'
import childProcess from 'child_process'

const log = console.log
const program = new Command()
const green = chalk.green

const isYarnInstalled = () => {
  try {
    childProcess.execSync('yarn --version');
    return true;
  } catch {
    return false; 
  }
}

const isBunInstalled = () => {
  try {
    childProcess.execSync('bun --version')
    return true;
  } catch(err) {
    return false; 
  }
}

async function main() {
  const spinner = ora({
    text: 'Creating smart post.'
  })
  try {
    const kebabRegez = /^([a-z]+)(-[a-z0-9]+)*$/

    program
      .name('Create Smart Post')
      .description('Create a new Lens Smart Post with a single command.')
      .option('-n, --name <name of smart post>', 'Set the name of the Smart Post.')
  
    program.parse(process.argv)
  
    const args = program.args
    let appName = args[0]
  
    if (!appName || !kebabRegez.test(args[0])) {
      appName = await input({
        message: 'Enter your smart post name',
        default: 'my-smart-post',
        validate: d => {
         if(!kebabRegez.test(d)) {
          return 'please enter your smart post name in the format of my-smart-post-name'
         }
         return true
        }
      })
    }
    
    let repoUrl = 'https://github.com/defispartan/lens-hello-world-open-action.git'

    log(`\nInitializing project \n`)

    spinner.start()
    await execa('git', ['clone', repoUrl, appName])

    let packageJson = fs.readFileSync(`${appName}/frontend/package.json`, 'utf8')
    const packageObj = JSON.parse(packageJson)
    packageObj.name = appName
    packageJson = JSON.stringify(packageObj, null, 2)
    console.log('packageJson: ', packageJson)
    fs.writeFileSync(`${appName}/frontend/package.json`, packageJson)

    process.chdir(path.join(process.cwd(), appName, 'frontend'))
    spinner.text = ''
    let startCommand = ''

    if (isBunInstalled()) {
      spinner.text = 'Installing dependencies'
      await execaCommand('bun install').pipeStdout(process.stdout)
      spinner.text = ''
      startCommand = 'bun dev'
      console.log('\n')
    } else if (isYarnInstalled()) {
      await execaCommand('yarn').pipeStdout(process.stdout)
      startCommand = 'yarn dev'
    } else {
      spinner.text = 'Installing dependencies'
      await execa('npm', ['install', '--verbose']).pipeStdout(process.stdout)
      spinner.text = ''
      startCommand = 'npm run dev'
    }
    // process.chdir(path.join(process.cwd(), appName))
    spinner.stop() 
    log(`${green.bold('Success!')} Created ${appName}. \n`)
    log(`To get started: \n
    1. Change into the ${chalk.cyan("contracts")} directory and configure your environment variables by copying the ${chalk.cyan(".env.example")} file to ${chalk.cyan(".env")} and filling in the values. \n
    2. Run script to deploy ${chalk.cyan("HelloWorld.sol")} and ${chalk.cyan("HelloWorldOpenAction.sol")} to Mumbai: \n\n       ${chalk.magentaBright("forge script script/HelloWorld.s.sol:HelloWorldScript --rpc-url $MUMBAI_RPC_URL --broadcast --verify -vvvv")} \n
    3. In a separate window, change into the frontend directory and configure the deployed contract addresses in ${chalk.cyan('frontend/src/constants.ts')} \n
    4. Run ${chalk.cyan(startCommand)}`)
  } catch (err) {
    console.log('error: ', err)
    log('\n')
    if (err.exitCode == 128) {
      log('Error: directory already exists.')
    }
    spinner.stop()
  }
}
main()