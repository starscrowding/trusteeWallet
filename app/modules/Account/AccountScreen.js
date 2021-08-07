/**
 * @version 0.43
 * @author yura
 */
import React from 'react'
import { connect } from 'react-redux'

import {
    Platform,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
    FlatList,
} from 'react-native'

import LottieView from 'lottie-react-native'

import GradientView from '@app/components/elements/GradientView'
import NavStore from '@app/components/navigation/NavStore'
import Loader from '@app/components/elements/LoaderItem'
import AppLockBlur from '@app/components/AppLockBlur'

import transactionDS from '@app/appstores/DataSource/Transaction/Transaction'
import transactionActions from '@app/appstores/Actions/TransactionActions'
import { showModal } from '@app/appstores/Stores/Modal/ModalActions'
import { setSelectedAccount } from '@app/appstores/Stores/Main/MainStoreActions'

import Log from '@app/services/Log/Log'
import checkTransferHasError from '@app/services/UI/CheckTransferHasError/CheckTransferHasError'
import MarketingEvent from '@app/services/Marketing/MarketingEvent'

import UpdateTradeOrdersDaemon from '@app/daemons/back/UpdateTradeOrdersDaemon'
import UpdateAccountBalanceAndTransactions from '@app/daemons/back/UpdateAccountBalanceAndTransactions'
import UpdateAccountListDaemon from '@app/daemons/view/UpdateAccountListDaemon'
import UpdateAccountBalanceAndTransactionsHD from '@app/daemons/back/UpdateAccountBalanceAndTransactionsHD'
import UpdateOneByOneDaemon from '@app/daemons/back/UpdateOneByOneDaemon'

import { strings } from '@app/services/i18n'

import { HIT_SLOP } from '@app/theme/HitSlop'
import CustomIcon from '@app/components/elements/CustomIcon'

import { getAccountFioName } from '@crypto/blockchains/fio/FioUtils'

import { ThemeContext } from '@app/theme/ThemeProvider'

import Header from './elements/Header'
import HeaderBlocks from './elements/HeaderBlocks'
import AccountButtons from './elements/AccountButtons'
import Transaction from './elements/Transaction'
import BalanceHeader from './elements/AccountData'

import blackLoader from '@assets/jsons/animations/refreshBlack.json'
import whiteLoader from '@assets/jsons/animations/refreshWhite.json'
import MarketingAnalytics from '@app/services/Marketing/MarketingAnalytics'

import Netinfo from '@app/services/Netinfo/Netinfo'

import { diffTimeScan } from './helpers'
import { SendActionsStart } from '@app/appstores/Stores/Send/SendActionsStart'
import { getIsBlurVisible, getSelectedAccountData, getSelectedAccountTransactions, getSelectedCryptoCurrencyData, getSelectedWalletData } from '@app/appstores/Stores/Main/selectors'
import { getIsBalanceVisible, getIsSegwit } from '@app/appstores/Stores/Settings/selectors'
import store from '@app/store'
import BlocksoftExternalSettings from '@crypto/common/BlocksoftExternalSettings'
import trusteeAsyncStorage from '@appV2/services/trusteeAsyncStorage/trusteeAsyncStorage'

let CACHE_ASKED = false
let CACHE_CLICKED_BACK = false
let CACHE_TX_LOADED = 0
const TX_PER_PAGE = 20

class Account extends React.PureComponent {

    constructor(props) {
        super(props)
        this.state = {
            refreshing: false,
            clickRefresh: false,

            transactionsToView: [],

            fioMemo: {},
            isBalanceVisible: false,
            isBalanceVisibleTriggered: false,

            hasStickyHeader: false,
        }
    }

    async componentDidMount() {
        const { currencyCode } = this.props.selectedCryptoCurrencyData
        if (currencyCode === 'FIO') {
            const fioAccount = await getAccountFioName()
            if (!fioAccount) {
                showModal({
                    type: 'YES_NO_MODAL',
                    title: strings('account.fioAccount.title'),
                    icon: 'INFO',
                    description: strings('account.fioAccount.description')
                }, this.handleRegisterFIOAddress)
            }
        }

        this._onLoad()
    }

    async _onLoad() {
        CACHE_ASKED = trusteeAsyncStorage.getExternalAsked()
        CACHE_CLICKED_BACK = false
    }

    triggerBalanceVisibility = (value, originalVisibility) => {
        this.setState((state) => ({ isBalanceVisible: value || originalVisibility, isBalanceVisibleTriggered: true }))
    }

    updateOffset = (event) => {
        const offset = event.nativeEvent.contentOffset.y
        const newOffset = Math.round(offset)
        if (!this.state.hasStickyHeader && newOffset > 260) this.setState(() => ({ hasStickyHeader: true }))
        if (this.state.hasStickyHeader && newOffset < 260) this.setState(() => ({ hasStickyHeader: false }))
    }

    handleRegisterFIOAddress = async () => {
        const { address } = this.props.selectedAccountData
        const link = BlocksoftExternalSettings.getStatic('FIO_REGISTRATION_URL')
        NavStore.goNext('WebViewScreen', { url: link + address, title: strings('fioMainSettings.registerFioAddress') })
    }

    handleReceive = () => {
        const { walletHash, address } = this.props.selectedAccountData
        const { currencyCode, currencySymbol } = this.props.selectedCryptoCurrencyData

        checkTransferHasError({
            walletHash,
            currencyCode,
            currencySymbol,
            addressFrom: address,
            addressTo: address
        })
        NavStore.goNext('AccountReceiveScreen')
    }

    handleSend = async () => {
        const { isSynchronized } = this.props.selectedAccountData
        const { currencyCode } = this.props.selectedCryptoCurrencyData

        if (isSynchronized) {
            await SendActionsStart.startFromAccountScreen(currencyCode)
        } else {
            showModal({
                type: 'INFO_MODAL',
                icon: 'INFO',
                title: strings('modal.cryptocurrencySynchronizing.title'),
                description: strings('modal.cryptocurrencySynchronizing.description')
            })
        }
    }

    handleBuy = async () => {
        const { currencyCode } = this.props.selectedCryptoCurrencyData
        const { basicCurrencyCode } = this.props.selectedAccountData

        try {
            await Netinfo.isInternetReachable()

            const showMsg = trusteeAsyncStorage.getSmartSwapMsg() === '1'
            if (!showMsg) {
                showModal({
                    type: 'MARKET_MODAL',
                    icon: 'INFO',
                    title: strings('modal.marketModal.title'),
                    description: strings('modal.marketModal.description'),
                }, () => {
                    this.props.navigation.jumpTo('MarketScreen', {screen: 'MarketScreen', params: {
                        inCurrencyCode: basicCurrencyCode,
                        outCurrencyCode: currencyCode
                    }})
                })
            } else {
                this.props.navigation.jumpTo('MarketScreen', {screen: 'MarketScreen', params: {
                    inCurrencyCode: basicCurrencyCode,
                    outCurrencyCode: currencyCode
                }})
            }

            // }
        } catch (e) {
            if (Log.isNetworkError(e.message)) {
                Log.log('HomeScreen.BottomNavigation handleMainMarket error ' + e.message)
            } else {
                Log.err('HomeScreen.BottomNavigation handleMainMarket error ' + e.message)
            }
        }
    }

    handleRefresh = async (click = false) => {
        const { walletIsHd } = this.props.selectedWalletData
        const { currencyCode } = this.props.selectedCryptoCurrencyData
        this.setState({
            refreshing: !click,
            clickRefresh: click,
        })

        UpdateOneByOneDaemon._canUpdate = false

        let needRefresh = false
        if (currencyCode !== 'ETH_ROPSTEN' && currencyCode !== 'ETH_RINKEBY') {
            try {
                if (await UpdateTradeOrdersDaemon.updateTradeOrdersDaemon({ force: true, source: 'ACCOUNT_REFRESH' })) {
                    needRefresh = true
                }
            } catch (e) {
                Log.errDaemon('AccountScreen handleRefresh error updateTradeOrdersDaemon ' + e.message)
            }
        }

        try {
            if (await UpdateAccountBalanceAndTransactions.updateAccountBalanceAndTransactions({
                force: true,
                currencyCode,
                source: 'ACCOUNT_REFRESH'
            })) {
                needRefresh = true
            }
            if (currencyCode === 'BTC' && walletIsHd) {
                if (await UpdateAccountBalanceAndTransactionsHD.updateAccountBalanceAndTransactionsHD({
                    force: true,
                    currencyCode,
                    source: 'ACCOUNT_REFRESH'
                })) {
                    needRefresh = true
                }
            }
        } catch (e) {
            Log.errDaemon('AccountScreen handleRefresh error updateAccountBalanceAndTransactions ' + e.message)
        }

        if (needRefresh) {
            try {
                await UpdateAccountListDaemon.updateAccountListDaemon({
                    force: true,
                    currencyCode,
                    source: 'ACCOUNT_REFRESH'
                })
            } catch (e) {
                Log.errDaemon('AccountScreen handleRefresh error updateAccountListDaemon ' + e.message)
            }
            await setSelectedAccount('AccountScreen.handeRefresh')
            this.loadTransactions(0)
        }


        UpdateOneByOneDaemon._canUpdate = true

        this.setState({
            refreshing: false,
            clickRefresh: false
        })
    }

    renderSynchronized = (allTransactionsToView) => {
        const { balanceScanTime, balanceScanError, isSynchronized } = this.props.selectedAccountData
        let { transactionsToView } = this.state
        if (typeof transactionsToView === 'undefined' || !transactionsToView || transactionsToView.length === 0) {
            transactionsToView = this.props.selectedAccountTransactions.transactionsToView
        }

        const { colors, GRID_SIZE, isLight } = this.context

        const diff = diffTimeScan(balanceScanTime)
        let diffTimeText = ''
        if (diff > 60) {
            diffTimeText = strings('account.soLong')
        } else {
            if (diff < 1) {
                diffTimeText = strings('account.justScan')
            } else {
                diffTimeText = strings('account.scan', { time: diff })
            }
            if (balanceScanError && balanceScanError !== '' && balanceScanError !== 'null') {
                diffTimeText += '\n' + strings(balanceScanError)
            }
        }

        return (
            <View style={{ flexDirection: 'column', marginHorizontal: GRID_SIZE, marginBottom: GRID_SIZE }}>
                <View style={{ marginTop: 24, flexDirection: 'row', position: 'relative', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'column' }} >
                        <Text style={{ ...styles.transaction_title, color: colors.common.text1 }}>{strings('account.history')}</Text>
                        <View style={{ ...styles.scan, marginLeft: 16 }}>
                            {isSynchronized ?
                                <Text style={{ ...styles.scan__text, color: colors.common.text2 }} numberOfLines={2} >{diffTimeText}</Text>
                                :
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginRight: 10,
                                    marginTop: 2
                                }}><Text style={{
                                    ...styles.transaction__empty_text, ...{
                                        marginLeft: 0,
                                        marginRight: 10,
                                        marginTop: 0,
                                        color: colors.common.text1
                                    }
                                }}>{strings('homeScreen.synchronizing')}</Text>
                                    <Loader size={14} color={'#999999'} />
                                </View>
                            }
                        </View>
                    </View>
                    <TouchableOpacity style={{ ...styles.scan, alignItems: 'center', marginRight: GRID_SIZE }} onPress={() => this.handleRefresh(true)} hitSlop={HIT_SLOP} >
                        {this.state.clickRefresh ?
                            <LottieView style={{ width: 20, height: 20, }}
                                source={isLight ? blackLoader : whiteLoader}
                                autoPlay loop /> :
                            <CustomIcon name={'reloadTx'} size={20} color={colors.common.text1} />}
                    </TouchableOpacity>
                </View>
                {
                    allTransactionsToView.length === 0 && (!transactionsToView || transactionsToView.length === 0) && isSynchronized ?
                        <View style={{ marginRight: GRID_SIZE }} >
                            <Text
                                style={{ ...styles.transaction__empty_text, marginTop: GRID_SIZE, color: colors.common.text3 }}>
                                {strings('account.noTransactions')}
                            </Text>
                        </View>

                        : null
                }
            </View>
        )

    }

    closeAction = () => {
        if (!CACHE_CLICKED_BACK) {
            CACHE_CLICKED_BACK = true
            NavStore.goBack()
        }
    }

    handleShowMore = () => {
        if (this.state.clickRefresh) return
        this.loadTransactions(this.state.transactionsToView.length)
    }

    async loadTransactions(from = 6, perPage = TX_PER_PAGE) {
        const { walletIsHideTransactionForFee } = this.props.selectedWalletData
        const { walletHash } = this.props.selectedAccountData
        const { currencyCode } = this.props.selectedCryptoCurrencyData


        const params = {
            walletHash,
            currencyCode,
            limitFrom: from,
            limitPerPage: perPage
        }
        if (walletIsHideTransactionForFee) {
            params.minAmount = 0
        }
        const tmp = await transactionDS.getTransactions(params, 'AccountScreen.loadTransactions list')
        const transactionsToView = []

        if (tmp && tmp.length > 0) {
            const account = store.getState().mainStore.selectedAccount
            for (let transaction of tmp) {
                transaction = transactionActions.preformatWithBSEforShow(transactionActions.preformat(transaction, { account }), transaction.bseOrderData, currencyCode)
                transactionsToView.push(transaction)
            }
        }
        CACHE_TX_LOADED = new Date().getTime()

        if (from === 0) {
            this.setState((state) => ({ transactionsToView: transactionsToView })) // from start reload
        } else {
            this.setState((state) => ({ transactionsToView: state.transactionsToView.concat(transactionsToView) }))
        }
    }

    getPrettyCurrencyName = (currencyCode, currencyName) => {
        switch (currencyCode) {
            case 'USDT':
                return 'Tether Bitcoin'
            case 'ETH_USDT':
                return 'Tether Ethereum'
            case 'TRX_USDT':
                return 'Tether Tron'
            default:
                return currencyName
        }
    }

    render() {
        if (this.props.isBlurVisible) {
            return <AppLockBlur />
        }

        MarketingAnalytics.setCurrentScreen('Account.AccountScreen')

        const { colors } = this.context
        const { isSegwit, selectedAccountData, selectedCryptoCurrencyData } = this.props
        let { transactionsToView } = this.state
        if (typeof transactionsToView === 'undefined' || !transactionsToView || transactionsToView.length === 0) {
            transactionsToView = this.props.selectedAccountTransactions.transactionsToView
            CACHE_TX_LOADED = this.props.selectedAccountTransactions.transactionsLoaded
        } else if (CACHE_TX_LOADED*1 <= this.props.selectedAccountTransactions.transactionsLoaded*1) {
            transactionsToView = this.props.selectedAccountTransactions.transactionsToView
            CACHE_TX_LOADED = this.props.selectedAccountTransactions.transactionsLoaded
            this.loadTransactions(0)
        }

        const allTransactionsToView = transactionsToView // was concat before

        let shownAddress = selectedAccountData.address
        if (selectedAccountData.segwitAddress) {
            shownAddress = isSegwit ? selectedAccountData.segwitAddress : selectedAccountData.legacyAddress
        }

        if (selectedAccountData.balanceProvider) {
            const logData = {
                currency: selectedCryptoCurrencyData.currencyCode,
                address: shownAddress,
                amount: selectedAccountData.balancePretty + '',
                unconfirmed: selectedAccountData.unconfirmedPretty + '',
                balanceScanTime: selectedAccountData.balanceScanTime + '',
                balanceScanError: selectedAccountData.balanceScanError + '',
                balanceProvider: selectedAccountData.balanceProvider + '',
                balanceScanLog: selectedAccountData.balanceScanLog + '',
                balanceAddingLog: selectedAccountData.balanceAddingLog + '',
                basicCurrencyCode: selectedAccountData.basicCurrencyCode + '',
                basicCurrencyBalance: selectedAccountData.basicCurrencyBalance + '',
                basicCurrencyRate: selectedAccountData.basicCurrencyRate + ''
            }

            if (selectedAccountData.segwitAddress) {
                logData.legacyAddress = selectedAccountData.legacyAddress || ''
                logData.segwitAddress = selectedAccountData.segwitAddress || ''
            }
            MarketingEvent.logEvent('view_account', logData)
        }


        return (
            <View style={{ flex: 1, backgroundColor: colors.common.background }}>
                <Header
                    leftType="back"
                    leftAction={this.closeAction}
                    rightType="close"
                    rightAction={this.closeAction}
                    title={this.getPrettyCurrencyName(selectedCryptoCurrencyData.currencyCode, selectedCryptoCurrencyData.currencyName)}
                    ExtraView={() => (
                        <BalanceHeader
                            balancePretty={selectedAccountData.balancePretty}
                            currencySymbol={selectedCryptoCurrencyData.currencySymbol}
                            actionReceive={this.handleReceive}
                            actionBuy={this.handleBuy}
                            actionSend={this.handleSend}
                            isBalanceVisible={this.state.isBalanceVisible}
                            isBalanceVisibleTriggered={this.state.isBalanceVisibleTriggered}
                            originalVisibility={this.props.isBalanceVisible}
                        />
                    )}
                    hasStickyHeader={this.state.hasStickyHeader}
                />
                <View style={styles.stub} />
                <FlatList
                    data={allTransactionsToView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.wrapper__scrollView}
                    initialNumToRender={20}
                    maxToRenderPerBatch={TX_PER_PAGE}
                    updateCellsBatchingPeriod={100}
                    onScroll={this.updateOffset}
                    getItemLayout={(data, index) => ({ length: 110, offset: 110 * index, index })}
                    refreshControl={
                        <RefreshControl
                            refreshing={this.state.refreshing}
                            onRefresh={this.handleRefresh}
                            tintColor={colors.common.text1}
                        />
                    }
                    ListHeaderComponent={() => (
                        <React.Fragment>
                            <HeaderBlocks
                                account={{
                                    walletHash: selectedAccountData.walletHash,
                                    shownAddress,
                                    balancePretty: selectedAccountData.balancePretty,
                                    basicCurrencySymbol: selectedAccountData.basicCurrencySymbol,
                                    basicCurrencyBalance: selectedAccountData.basicCurrencyBalance,
                                    isSynchronized: selectedAccountData.isSynchronized,
                                    walletPubs: selectedAccountData.walletPubs
                                }}
                                cryptoCurrency={{
                                    currencyCode: selectedCryptoCurrencyData.currencyCode,
                                    currencySymbol: selectedCryptoCurrencyData.currencySymbol,
                                    currencyExplorerLink: selectedCryptoCurrencyData.currencyExplorerLink
                                }}
                                isSegwit={isSegwit}
                                cacheAsked={CACHE_ASKED}
                                isBalanceVisible={this.state.isBalanceVisible}
                                isBalanceVisibleTriggered={this.state.isBalanceVisibleTriggered}
                                originalVisibility={this.props.isBalanceVisible}
                                triggerBalanceVisibility={this.triggerBalanceVisibility}
                            />
                            <AccountButtons
                                title={true}
                                actionReceive={this.handleReceive}
                                actionBuy={this.handleBuy}
                                actionSend={this.handleSend}
                            />
                            <View>
                                {this.renderSynchronized(allTransactionsToView)}
                            </View>
                        </React.Fragment>
                    )}
                    renderItem={({ item, index }) => (
                        <Transaction
                            isFirst={index === 0}
                            transaction={item}
                            cryptoCurrency={{
                                currencyCode: selectedCryptoCurrencyData.currencyCode,
                                currencySymbol: selectedCryptoCurrencyData.currencySymbol,
                                currencyColor: this.context.isLight ? selectedCryptoCurrencyData.mainColor : selectedCryptoCurrencyData.darkColor
                            }}
                            dashHeight={allTransactionsToView.length === 1 ? 0 : (allTransactionsToView.length - 1 === index) ? 50 : 150}
                        />
                    )}
                    onEndReachedThreshold={0.5}
                    onEndReached={this.handleShowMore}
                    keyExtractor={item => (item.id || ('bse_' + item.bseOrderData.orderId)).toString()}
                />
                <GradientView style={styles.bottomButtons} array={colors.accountScreen.bottomGradient} start={styles.containerBG.start} end={styles.containerBG.end} />
            </View>
        )
    }
}

Account.contextType = ThemeContext

const mapStateToProps = (state) => {
    return {
        selectedWalletData: getSelectedWalletData(state),
        selectedCryptoCurrencyData: getSelectedCryptoCurrencyData(state),
        selectedAccountData: getSelectedAccountData(state),
        selectedAccountTransactions: getSelectedAccountTransactions(state),
        isBalanceVisible: getIsBalanceVisible(state.settingsStore),
        isSegwit: getIsSegwit(state),
        isBlurVisible: getIsBlurVisible(state)
    }
}

export default connect(mapStateToProps)(Account)

const styles = {
    wrapper__scrollView: {
        paddingBottom: 20,
    },
    stub: {
        marginBottom: Platform.OS === 'android' ? 50 : 84,
    },
    wrapper__content: {
        flex: 1
    },
    bottomButtons: {
        position: 'absolute',
        bottom: 0,
        left: 0,

        width: '100%',
        height: 66,
        paddingBottom: Platform.OS === 'ios' ? 30 : 0
    },
    scan: {
        flexDirection: 'row'
    },
    scan__text: {
        letterSpacing: 1,
        fontFamily: 'SFUIDisplay-Semibold',
        fontSize: 14,
        lineHeight: 18
    },
    containerBG: {
        start: { x: 1, y: 0 },
        end: { x: 1, y: 1 }
    },
    transaction_title: {
        marginLeft: 16,
        marginBottom: 4,
        fontSize: 17,
        fontFamily: 'Montserrat-Bold'
    },
    transaction__empty_text: {
        marginTop: -5,
        marginLeft: 16,
        fontSize: 15,
        lineHeight: 19,
        fontFamily: 'SFUIDisplay-Semibold',
        letterSpacing: 1.5
    },
    showMore: {
        flexDirection: 'row',
        justifyContent: 'center',

        padding: 10,
        marginBottom: 60
    },
    showMore__btn: {
        marginRight: 5,

        fontSize: 10,
        fontFamily: 'SFUIDisplay-Bold'
    }
}
