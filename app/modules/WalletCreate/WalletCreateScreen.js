/**
 * @version 0.9
 */
import React, { Component } from 'react'
import {
    View,
    Image,
    Animated,
    Text,
    Platform,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native'
import { connect } from 'react-redux'
import { Pages } from 'react-native-pages'


import LottieView from 'lottie-react-native'

import Agreement from './elements/Agreement'
import Button from '../../components/elements/new/buttons/Button'

import NavStore from '../../components/navigation/NavStore'

import {
    setCallback,
    setFlowType,
    setMnemonicLength,
    setWalletName
} from '../../appstores/Stores/CreateWallet/CreateWalletActions'

import Log from '../../services/Log/Log'
import { strings, sublocale } from '../../services/i18n'

import BlocksoftExternalSettings from '../../../crypto/common/BlocksoftExternalSettings'

import { ThemeContext } from '../../modules/theme/ThemeProvider'

import SliderImage1 from '../../assets/images/slider/1.png';
import SliderImage2 from '../../assets/images/slider/2.png';
import SliderImage3 from '../../assets/images/slider/3.png';
import SliderImage4 from '../../assets/images/slider/4.png';
import MarketingAnalytics from '../../services/Marketing/MarketingAnalytics'


const screenWidth = Dimensions.get('window').width;

const getSliderData = () => [
    {
        image: SliderImage1,
        text: strings('walletCreateScreen.slider1')
    },
    {
        image: SliderImage2,
        text: strings('walletCreateScreen.slider2')
    },
    {
        image: SliderImage3,
        text: strings('walletCreateScreen.slider3')
    },
    {
        image: SliderImage4,
        text: strings('walletCreateScreen.slider4'),
        textStyle: { textDecorationLine: 'line-through' }
    },
];

const SLIDER_SCROLL_TIMEOUT = 4000

class WalletCreateScreen extends Component {
    state = {
        checked: false
    }

    sliderData = getSliderData()
    sliderTimer;
    sliderRef = React.createRef

    componentDidMount() {
        Log.log('WalletCreateScreen is mounted')

        this.runSliderTimer()
    }

    runSliderTimer = () => {
        this.sliderTimer = setInterval(() => {
            const index = this.sliderRef.activeIndex < this.sliderData.length - 1 ? this.sliderRef.activeIndex + 1 : 0
            this.sliderRef.scrollToPage?.(index)
        }, SLIDER_SCROLL_TIMEOUT)
    }

    handleSelect = (data) => {
        setFlowType(data)
        setCallback({
            callback: async () => {
                NavStore.reset('InitScreen')
            }
        })

        setWalletName({ walletName: '' })
        setMnemonicLength({ mnemonicLength: 128 })

        if (data.flowType === 'CREATE_NEW_WALLET') {
            NavStore.goNext('BackupStep0Screen', { flowSubtype: 'createFirst' })
        } else {
            NavStore.goNext('EnterMnemonicPhrase', { flowSubtype: 'importFirst' })
        }
        setTimeout(() => { this.setState(() => ({ checked: false })) }, 500)
    }

    handleCreate = () => { this.handleSelect({ flowType: 'CREATE_NEW_WALLET' }) }

    handleImport = () => { this.handleSelect({ flowType: 'IMPORT_WALLET' }) }

    changeAgreementCallback = () => {
        this.setState(state => ({ checked: !state.checked }))
    }

    handleTermsPress = () => {
        const lang = sublocale()
        const url = BlocksoftExternalSettings.getStatic(`TERMS_${lang}`)
        NavStore.goNext('WebViewScreen', { url, title: strings('walletCreateScreen.terms') })
    }

    handlePrivacyPolicyPress = () => {
        const lang = sublocale()
        const url = BlocksoftExternalSettings.getStatic(`PRIVACY_POLICY_${lang}`)
        NavStore.goNext('WebViewScreen', { url, title: strings('walletCreateScreen.privacyPolicy') })
    }

    renderSliderPage = ({ image, text, textStyle }) => {
        const { colors, GRID_SIZE } = this.context
        return (
            <View style={styles.sliderItem}>
                <Image
                    source={image}
                    style={[
                        styles.sliderImage,
                        {
                            width: GRID_SIZE === 16 ? styles.sliderImage.width : styles.sliderImage.width - 50,
                            height: GRID_SIZE === 16 ? styles.sliderImage.height : styles.sliderImage.height - 50,
                        }
                    ]}
                    resizeMode="contain"
                />
                <Text
                    style={[
                        styles.sliderText,
                        textStyle,
                        { color: colors.createWalletScreen.sliderText, marginHorizontal: GRID_SIZE * 3 }
                    ]}
                >{text}</Text>
            </View>
        )
    }

    render() {
        const { logoShow } = this.state
        const { colors, GRID_SIZE } = this.context

        MarketingAnalytics.setCurrentScreen('WalletCreate.WalletCreateScreen')

        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={[styles.topContent, { backgroundColor: colors.createWalletScreen.sliderBg }]}>
                    <Pages ref={ref => { this.sliderRef = ref }}>
                        {this.sliderData.map(this.renderSliderPage)}
                    </Pages>
                </View>
                <View style={[styles.bottomContent, { paddingHorizontal: GRID_SIZE, backgroundColor: colors.common.background }]}>
                    <View style={[styles.agreementContainer, { marginHorizontal: GRID_SIZE }]}>
                        <Agreement
                            checked={this.state.checked}
                            onPress={this.changeAgreementCallback}
                            handleTerms={this.handleTermsPress}
                            handlePrivacyPolicy={this.handlePrivacyPolicyPress}
                        />
                    </View>
                    <Button
                        title={strings('walletCreateScreen.createWallet')}
                        disabled={!this.state.checked}
                        onPress={this.handleCreate}
                    />
                    <Button
                        type="transparent"
                        title={strings('walletCreateScreen.importWallet')}
                        disabled={!this.state.checked}
                        onPress={this.handleImport}
                        containerStyle={styles.importButton}
                    />
                </View>
            </View>
        )
    }
}

WalletCreateScreen.contextType = ThemeContext

const mapStateToProps = (state) => {
    return {}
}

export default connect(mapStateToProps, {})(WalletCreateScreen)

const styles = {
    container: {
        flex: 1
    },
    topContent: {
        flex: 3,
        paddingVertical: 20
    },
    bottomContent: {
        flex: 2,
        justifyContent: 'center',
        paddingBottom: 16
    },
    sliderItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 35,
    },
    sliderImage: {
        width: screenWidth - 100,
        height: screenWidth - 100,
        maxWidth: 450,
        maxHeight: 450,
    },
    sliderText: {
        fontFamily: 'SFUIDisplay-Regular',
        fontSize: 16,
        lineHeight: 20,
        letterSpacing: 0.5,
        textAlign: 'center',
        marginTop: 15,
    },
    agreementContainer: {
        marginBottom: 20
    },
    importButton: {
        marginTop: 8
    }
};
