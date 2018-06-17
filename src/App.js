import React, { Component } from 'react'
import moment from 'moment'
import './App.css'
import TransactionStatus from './components/TransactionStatus.js'
import InfoRow from './components/InfoRow.js'
import * as api from './api/web3Wrapper.js'
import * as ethplorer from './api/ethplorer.js'
import { Button, Grid, Message, Segment, Input } from 'semantic-ui-react'
import AddressInfo from './components/AddressInfo'
import ContractInfo from './components/ContractInfo'

class App extends Component {
  constructor (props) {
    super(props)
    this.initialState = {
      searchValue: '',
      error: null,
      transaction: null,
      receipt: null,
      block: null,
      address: null
    }

    this.state = {
      ...this.initialState,
      searchFinished: false,
      currentBlock: -1,
      blocks: {}
    }
  }

  componentDidMount () {
    this.timerID = setInterval(this.getCurrentBlock, 3000)
  }

  componentWillUnmount () {
    clearInterval(this.timerID)
  }

  onError = error => {
    this.setState({
      error: error.message
    })
  }

  getCurrentBlock = () => {
    api.getBlockNumber(currentBlock => this.setState({ currentBlock }))
  }

  reset = () => {
    this.setState({
      ...this.initialState,
      searchFinished: false
    })
  }

  handleTransactionInfo = (error, info) => {
    this.setState({ searchFinished: true })
    if (error) this.onError(error)
    if (info) {
      console.log('info', info)
      this.setState({ ...info })
    }
  }

  handleBlockInfo = (error, block) => {
    this.setState({ searchFinished: true })
    if (error) this.onError(error)
    if (block) {
      this.setState({ block })
    }
  }

  handleAddressInfo = address => {
    console.log(address)
    this.setState({ address })
  }

  onKeyPress = e => {
    if (e.key === 'Enter') {
      this.onSearch()
    }
  }

  onSearch = () => {
    const { searchValue } = this.state
    this.reset()
    if (api.isAddress(searchValue)) {
      ethplorer.getAddressInfo(
        searchValue,
        this.handleAddressInfo,
        this.onError
      )
    } else {
      var re = /0x[0-9A-Fa-f]{64}/g
      const isHash = re.test(searchValue)
      if (isHash) {
        api.getTransaction(searchValue, this.handleTransactionInfo)
      } else {
        this.setState({
          error: `${searchValue} is not a valid txHash`
        })
      }
    }
  }

  onChange = e => this.setState({ searchValue: e.target.value.trim() })

  fromWei = (wei, unit) => {
    return `${api.fromWei(wei, unit)} ${unit[0].toUpperCase()}${unit.slice(1)}`
  }

  getConfirmations = blockNumber => {
    const { currentBlock } = this.state
    if (currentBlock === -1) return ''
    return `(${this.state.currentBlock - blockNumber} confirmations)`
  }

  receiveBlock = (error, block) => {
    if (error) console.error(error.message)
    if (block) {
      this.setState({
        blocks: {
          ...this.state.blocks,
          [block.number]: block
        }
      })
    }
  }

  getBlockTimestamp = blockNumber => {
    const block = this.state.blocks[blockNumber]
    if (block) {
      const timestamp = new Date(block.timestamp * 1000)
      const diff = moment(block.timestamp * 1000).fromNow()
      return `${diff} (${timestamp})`
    } else {
      api.getBlock(blockNumber, this.receiveBlock)
      return ''
    }
  }

  renderMainInfo = () => {
    const {
      error,
      searchValue,
      searchFinished,
      transaction,
      receipt,
      block,
      address
    } = this.state
    const notFound = !error && searchFinished && !transaction && !block
    if (address) {
      if (address.contractInfo) {
        return (
          <Grid.Row>
            <Grid.Column>
              <ContractInfo address={address} />
            </Grid.Column>
          </Grid.Row>
        )
      } else {
        return (
          <Grid.Row>
            <Grid.Column>
              <AddressInfo address={address} />
            </Grid.Column>
          </Grid.Row>
        )
      }
    }
    return (
      <React.Fragment>
        <Grid.Row>
          <Grid.Column>
            {notFound &&
              <Message warning>
                <Message.Header>Sorry</Message.Header>
                <p>{'There are no matching entries'}</p>
              </Message>}
          </Grid.Column>
        </Grid.Row>
        {searchFinished &&
          transaction &&
          <Grid.Row>
            <Grid.Column>
              <Segment.Group>
                <TransactionStatus receipt={receipt} />
                <InfoRow title='From:' content={transaction.from} />
                <InfoRow title='To:' content={transaction.to} />
                <InfoRow
                  title='Value:'
                  content={this.fromWei(transaction.value, 'ether')}
                />
              </Segment.Group>
            </Grid.Column>
          </Grid.Row>}
        {searchFinished &&
          receipt &&
          <Grid.Row>
            <Grid.Column>
              <Segment.Group>
                <InfoRow
                  title='Block height:'
                  content={`${receipt.blockNumber} ${this.getConfirmations(receipt.blockNumber)}`}
                />
                <InfoRow
                  title='Timestamp:'
                  content={this.getBlockTimestamp(receipt.blockNumber)}
                />
              </Segment.Group>
            </Grid.Column>
          </Grid.Row>}
        {searchFinished &&
          transaction &&
          <Grid.Row>
            <Grid.Column>
              <Segment.Group>
                <InfoRow title='Gas limit:' content={transaction.gas} />
                <InfoRow
                  title='Gas used by Txn:'
                  content={receipt ? receipt.gasUsed : <em>Pending</em>}
                />
                <InfoRow
                  title='Gas price:'
                  content={this.fromWei(transaction.gasPrice, 'gwei')}
                />
              </Segment.Group>
            </Grid.Column>
          </Grid.Row>}
      </React.Fragment>
    )
  }
  render () {
    const { error, searchFinished, transaction, receipt, block } = this.state
    const notFound = !error && searchFinished && !transaction && !block
    return (
      <Grid container style={{ padding: '5em 0em' }}>
        <Grid.Row>
          <Grid.Column>
            <Input
              fluid
              onKeyPress={this.onKeyPress}
              placeholder='Search by txHash or address'
              onChange={this.onChange}
              action={
                <Button color='teal' icon='search' onClick={this.onSearch} />
              }
            />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row>
          <Grid.Column>
            {error &&
              <Message error>
                <Message.Header>Something wrong</Message.Header>
                <p>{error}</p>
              </Message>}
          </Grid.Column>
        </Grid.Row>
        {this.renderMainInfo()}
      </Grid>
    )
  }
}

export default App
